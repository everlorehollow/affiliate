import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

/**
 * GET /api/shopify/install
 *
 * Initiates the Shopify OAuth Authorization Code Grant flow.
 * Only accessible to admin users.
 *
 * Redirects the admin to Shopify's authorization page where they
 * grant the app access to the store's Admin API.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!shopDomain || !clientId || !appUrl) {
    return NextResponse.json(
      { error: "Missing SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, or NEXT_PUBLIC_APP_URL" },
      { status: 500 }
    );
  }

  const scopes = "write_price_rules,read_price_rules,write_discounts,read_discounts";
  const redirectUri = `${appUrl}/api/shopify/callback`;
  const nonce = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", nonce);

  // Set a signed cookie with the nonce for CSRF protection
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("shopify_oauth_nonce", nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
