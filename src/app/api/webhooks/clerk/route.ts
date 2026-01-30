import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServerClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";
import crypto from "crypto";

// Generate a unique referral code from the user's name or email
function generateReferralCode(firstName: string | null, lastName: string | null, email: string): string {
  // Try to build a code from the name, fall back to email prefix
  let base = "";
  if (firstName && lastName) {
    base = (firstName.slice(0, 3) + lastName.slice(0, 3)).toUpperCase();
  } else if (firstName) {
    base = firstName.slice(0, 5).toUpperCase();
  } else {
    base = email.split("@")[0].slice(0, 5).toUpperCase().replace(/[^A-Z]/g, "");
  }

  // Ensure we have at least 3 chars
  if (base.length < 3) {
    base = "ELH";
  }

  // Append random suffix for uniqueness
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  return `${base}${suffix}`;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const supabase = createServerClient();

  // Verify webhook signature using Svix
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 401 });
  }

  let payload: any;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Clerk webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType = payload.type as string;

  try {
    if (eventType === "user.created") {
      await handleUserCreated(payload.data, supabase);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clerk webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleUserCreated(userData: any, supabase: any) {
  const clerkUserId = userData.id;
  const email = userData.email_addresses?.[0]?.email_address;
  const firstName = userData.first_name || null;
  const lastName = userData.last_name || null;

  if (!email) {
    console.error("Clerk user.created webhook: no email found for user", clerkUserId);
    return;
  }

  // Check if affiliate already exists (idempotency)
  const { data: existing } = await supabase
    .from("affiliates")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (existing) {
    console.log("Affiliate already exists for clerk user:", clerkUserId);
    return;
  }

  // Also check by email in case they were pre-created
  const { data: existingByEmail } = await supabase
    .from("affiliates")
    .select("id, clerk_user_id")
    .eq("email", email.toLowerCase())
    .single();

  if (existingByEmail) {
    // Link the existing record to this Clerk user if not already linked
    if (!existingByEmail.clerk_user_id) {
      await supabase
        .from("affiliates")
        .update({ clerk_user_id: clerkUserId })
        .eq("id", existingByEmail.id);
      console.log("Linked existing affiliate to clerk user:", clerkUserId);
    }
    return;
  }

  // Generate a unique referral code with retry
  let referralCode = generateReferralCode(firstName, lastName, email);
  let attempts = 0;
  while (attempts < 5) {
    const { data: codeExists } = await supabase
      .from("affiliates")
      .select("id")
      .eq("referral_code", referralCode)
      .single();

    if (!codeExists) break;

    // Regenerate with more randomness
    referralCode = generateReferralCode(firstName, lastName, email);
    attempts++;
  }

  // Create the affiliate record
  const { data: newAffiliate, error } = await supabase
    .from("affiliates")
    .insert({
      clerk_user_id: clerkUserId,
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      referral_code: referralCode,
      status: "pending",
      tier: "initiate",
      commission_rate: 0.10,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create affiliate record:", error);
    throw error;
  }

  // Log the signup activity
  await logActivity({
    affiliate_id: newAffiliate.id,
    action: "signup",
    details: {
      clerk_user_id: clerkUserId,
      email: email.toLowerCase(),
      referral_code: referralCode,
      source: "clerk_webhook",
      timestamp: new Date().toISOString(),
    },
  });

  console.log(`New affiliate created: ${email}, code: ${referralCode}, clerk: ${clerkUserId}`);
}
