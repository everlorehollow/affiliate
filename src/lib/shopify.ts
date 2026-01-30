/**
 * Shopify Admin API Client
 * Documentation: https://shopify.dev/docs/api/admin-rest
 *
 * Handles discount code creation for approved affiliates.
 * Uses the Price Rules + Discount Codes API.
 *
 * Authentication: Uses an offline access token obtained via the
 * Authorization Code Grant flow and stored in the shopify_tokens table.
 * https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
 */

import { createServerClient } from "@/lib/supabase";

interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
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
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.config.accessToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Shopify API error:", response.status, errorText);
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
          value: `-${params.discountPercentage}`,
          customer_selection: "all",
          starts_at: (params.startsAt || new Date()).toISOString(),
          ends_at: params.endsAt?.toISOString() || null,
          usage_limit: params.usageLimit ?? null,
          once_per_customer: params.oncePerCustomer ?? true,
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

/**
 * Get a Shopify client using the stored OAuth access token from the database.
 * Returns null if no token is stored (app not yet installed via OAuth).
 */
export async function getShopifyClient(): Promise<ShopifyClient | null> {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-01";

  if (!shopDomain) {
    console.warn("SHOPIFY_STORE_DOMAIN not configured");
    return null;
  }

  const supabase = createServerClient();
  const { data: tokenRecord, error } = await supabase
    .from("shopify_tokens")
    .select("access_token")
    .eq("shop_domain", shopDomain)
    .single();

  if (error || !tokenRecord?.access_token) {
    console.warn(
      "No Shopify access token found in database. " +
      "Visit /api/shopify/install to connect the Shopify app."
    );
    return null;
  }

  return new ShopifyClient({
    shopDomain,
    accessToken: tokenRecord.access_token,
    apiVersion,
  });
}

/**
 * Create an affiliate discount code in Shopify
 * Creates both the price rule and the discount code
 */
export async function createAffiliateDiscount(
  referralCode: string,
  affiliateName: string,
  discountPercentage: number = 10
): Promise<CreateDiscountResult> {
  const client = await getShopifyClient();

  if (!client) {
    return {
      success: false,
      error: "Shopify not connected. Visit /api/shopify/install to connect.",
    };
  }

  try {
    const existing = await client.lookupDiscountCode(referralCode);
    if (existing) {
      return {
        success: false,
        error: `Discount code "${referralCode}" already exists in Shopify`,
      };
    }

    const priceRule = await client.createPriceRule({
      title: `Affiliate - ${affiliateName} (${referralCode})`,
      discountPercentage,
      oncePerCustomer: true,
      usageLimit: null,
      combinesWithProductDiscounts: true,
      combinesWithShippingDiscounts: true,
    });

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
  const client = await getShopifyClient();

  if (!client) {
    return {
      success: false,
      error: "Shopify not connected. Visit /api/shopify/install to connect.",
    };
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
