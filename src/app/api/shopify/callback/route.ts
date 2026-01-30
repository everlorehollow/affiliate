import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import crypto from "crypto";

/**
 * GET /api/shopify/callback
 *
 * Handles the OAuth callback from Shopify after the merchant authorizes the app.
 * Exchanges the authorization code for an offline access token and stores it in Supabase.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop");
  const state = url.searchParams.get("state");
  const hmac = url.searchParams.get("hmac");

  // Validate required params
  if (!code || !shop || !state || !hmac) {
    return NextResponse.json({ error: "Missing required OAuth parameters" }, { status: 400 });
  }

  // Validate shop domain format
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  // Verify nonce matches cookie (CSRF protection)
  const storedNonce = request.cookies.get("shopify_oauth_nonce")?.value;
  if (!storedNonce || storedNonce !== state) {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 403 });
  }

  // Verify HMAC signature
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || process.env.SHOPIFY_ACCESS_TOKEN;
  if (!clientSecret) {
    return NextResponse.json({ error: "SHOPIFY_CLIENT_SECRET not configured" }, { status: 500 });
  }

  const queryParams = new URLSearchParams(url.search);
  queryParams.delete("hmac");
  // Sort params alphabetically and build the message
  const sortedParams = Array.from(queryParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const computedHmac = crypto
    .createHmac("sha256", clientSecret)
    .update(sortedParams)
    .digest("hex");

  if (computedHmac !== hmac) {
    return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 403 });
  }

  // Exchange authorization code for an access token
  const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  if (!clientId) {
    return NextResponse.json({ error: "SHOPIFY_CLIENT_ID not configured" }, { status: 500 });
  }

  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Failed to exchange code for token:", tokenResponse.status, errorText);
    return NextResponse.json(
      { error: `Failed to obtain access token: ${tokenResponse.status}` },
      { status: 500 }
    );
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  const scope = tokenData.scope;

  if (!accessToken) {
    console.error("No access_token in response:", tokenData);
    return NextResponse.json({ error: "No access token received" }, { status: 500 });
  }

  // Store the token in Supabase
  const supabase = createServerClient();
  const { error } = await supabase
    .from("shopify_tokens")
    .upsert(
      {
        shop_domain: shop,
        access_token: accessToken,
        scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop_domain" }
    );

  if (error) {
    console.error("Failed to store Shopify token:", error);
    return NextResponse.json({ error: "Failed to store token" }, { status: 500 });
  }

  console.log(`Shopify OAuth complete: ${shop}, scopes: ${scope}`);

  // Clear the nonce cookie and redirect to admin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const response = NextResponse.redirect(`${appUrl}/admin/affiliates?shopify=connected`);
  response.cookies.delete("shopify_oauth_nonce");

  return response;
}
