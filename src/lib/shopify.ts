/**
 * Shopify Admin API Client
 * Documentation: https://shopify.dev/docs/api/admin-rest
 *
 * Handles discount code creation for approved affiliates.
 * Uses the Price Rules + Discount Codes API.
 *
 * Authentication: Uses the Client Credentials Grant flow
 * (tokens expire every 24 hours and are refreshed automatically).
 * https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant
 */

interface ShopifyConfig {
  shopDomain: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
}

interface PriceRule {
  id: number;
  title: string;
  target_type: string;
  target_selection: string;
  allocation_method: string;
  value_type: string;
  value: string;
  customer_selection: string;
  starts_at: string;
  ends_at: string | null;
  usage_limit: number | null;
  once_per_customer: boolean;
}

interface DiscountCode {
  id: number;
  price_rule_id: number;
  code: string;
  usage_count: number;
  created_at: string;
}

interface CreateDiscountResult {
  success: boolean;
  priceRuleId?: number;
  discountCodeId?: number;
  code?: string;
  error?: string;
}

// Cached token state
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Obtain an Admin API access token using the Client Credentials Grant flow.
 * Tokens are cached and refreshed when they expire (every ~24 hours).
 */
async function getAccessToken(shopDomain: string, clientId: string, clientSecret: string): Promise<string> {
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedAccessToken;
  }

  const response = await fetch(
    `https://${shopDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to obtain Shopify access token:", response.status, errorText);
    throw new Error(`Failed to obtain Shopify access token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  // expires_in is in seconds (typically 86399 = ~24 hours)
  tokenExpiresAt = Date.now() + (data.expires_in || 86399) * 1000;

  return cachedAccessToken!;
}

export class ShopifyClient {
  private config: ShopifyConfig;

  constructor(config: ShopifyConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return `https://${this.config.shopDomain}/admin/api/${this.config.apiVersion}`;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const accessToken = await getAccessToken(
      this.config.shopDomain,
      this.config.clientId,
      this.config.clientSecret
    );

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Shopify API error:", response.status, errorText);

      // If we got a 401, the token may have expired early — clear cache and retry once
      if (response.status === 401 && cachedAccessToken) {
        cachedAccessToken = null;
        tokenExpiresAt = 0;
        const freshToken = await getAccessToken(
          this.config.shopDomain,
          this.config.clientId,
          this.config.clientSecret
        );
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": freshToken,
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!retryResponse.ok) {
          const retryError = await retryResponse.text();
          throw new Error(`Shopify API error: ${retryResponse.status} - ${retryError}`);
        }
        return retryResponse.json();
      }

      throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a price rule for an affiliate discount
   *
   * Note: For subscriptions (Recharge), this discount applies to the first order only.
   * Recharge handles recurring charges separately - the affiliate code won't auto-apply
   * to renewals, which is the desired behavior.
   */
  async createPriceRule(params: {
    title: string;
    discountPercentage: number;
    startsAt?: Date;
    endsAt?: Date | null;
    usageLimit?: number | null;
    oncePerCustomer?: boolean;
    combinesWithProductDiscounts?: boolean;
    combinesWithShippingDiscounts?: boolean;
  }): Promise<PriceRule> {
    const response = await this.request<{ price_rule: PriceRule }>(
      "POST",
      "/price_rules.json",
      {
        price_rule: {
          title: params.title,
          target_type: "line_item",
          target_selection: "all",
          allocation_method: "across",
          value_type: "percentage",
          value: `-${params.discountPercentage}`, // Negative for discount
          customer_selection: "all",
          starts_at: (params.startsAt || new Date()).toISOString(),
          ends_at: params.endsAt?.toISOString() || null,
          usage_limit: params.usageLimit ?? null,
          once_per_customer: params.oncePerCustomer ?? true, // Each customer can only use once
          // Combination settings (Shopify Plus or 2024+ API)
          combines_with_product_discounts: params.combinesWithProductDiscounts ?? true,
          combines_with_shipping_discounts: params.combinesWithShippingDiscounts ?? true,
        },
      }
    );

    return response.price_rule;
  }

  /**
   * Create a discount code for a price rule
   */
  async createDiscountCode(
    priceRuleId: number,
    code: string
  ): Promise<DiscountCode> {
    const response = await this.request<{ discount_code: DiscountCode }>(
      "POST",
      `/price_rules/${priceRuleId}/discount_codes.json`,
      {
        discount_code: {
          code: code.toUpperCase(),
        },
      }
    );

    return response.discount_code;
  }

  /**
   * Delete a price rule (and its associated discount codes)
   */
  async deletePriceRule(priceRuleId: number): Promise<void> {
    await this.request("DELETE", `/price_rules/${priceRuleId}.json`);
  }

  /**
   * Get a discount code by code string
   */
  async lookupDiscountCode(code: string): Promise<DiscountCode | null> {
    try {
      const response = await this.request<{ discount_codes: DiscountCode[] }>(
        "GET",
        `/discount_codes/lookup.json?code=${encodeURIComponent(code)}`
      );
      return response.discount_codes?.[0] || null;
    } catch {
      return null;
    }
  }
}

// Singleton instance
let shopifyClient: ShopifyClient | null = null;

export function getShopifyClient(): ShopifyClient | null {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID || process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || process.env.SHOPIFY_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-01";

  if (!shopDomain || !clientId || !clientSecret) {
    console.warn("Shopify credentials not configured - discount codes will not be created");
    return null;
  }

  if (!shopifyClient) {
    shopifyClient = new ShopifyClient({
      shopDomain,
      clientId,
      clientSecret,
      apiVersion,
    });
  }

  return shopifyClient;
}

/**
 * Create an affiliate discount code in Shopify
 * Creates both the price rule and the discount code
 *
 * Discount behavior:
 * - Works on both single products and subscriptions
 * - Can be combined with other discounts (product & shipping)
 * - Each customer can only use it once (first purchase only)
 * - For subscriptions: only applies to first charge, not recurring renewals
 *   (Recharge handles renewals separately without reapplying checkout discounts)
 * - Unlimited total uses across all customers
 */
export async function createAffiliateDiscount(
  referralCode: string,
  affiliateName: string,
  discountPercentage: number = 10
): Promise<CreateDiscountResult> {
  const client = getShopifyClient();

  if (!client) {
    return { success: false, error: "Shopify not configured" };
  }

  try {
    // Check if code already exists
    const existing = await client.lookupDiscountCode(referralCode);
    if (existing) {
      return {
        success: false,
        error: `Discount code "${referralCode}" already exists in Shopify`,
      };
    }

    // Create price rule with affiliate-specific settings
    const priceRule = await client.createPriceRule({
      title: `Affiliate - ${affiliateName} (${referralCode})`,
      discountPercentage,
      oncePerCustomer: true, // Customer can only use once (first order only)
      usageLimit: null, // Unlimited total uses across all customers
      combinesWithProductDiscounts: true, // Can stack with product discounts
      combinesWithShippingDiscounts: true, // Can stack with shipping discounts
    });

    // Create discount code
    const discountCode = await client.createDiscountCode(
      priceRule.id,
      referralCode
    );

    return {
      success: true,
      priceRuleId: priceRule.id,
      discountCodeId: discountCode.id,
      code: discountCode.code,
    };
  } catch (error) {
    console.error("Failed to create Shopify discount:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Shopify error",
    };
  }
}

/**
 * Delete an affiliate's discount code from Shopify
 */
export async function deleteAffiliateDiscount(
  priceRuleId: number
): Promise<{ success: boolean; error?: string }> {
  const client = getShopifyClient();

  if (!client) {
    return { success: false, error: "Shopify not configured" };
  }

  try {
    await client.deletePriceRule(priceRuleId);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete Shopify discount:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Shopify error",
    };
  }
}
