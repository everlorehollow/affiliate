/**
 * Shopify Admin API Client
 * Documentation: https://shopify.dev/docs/api/admin-graphql
 *
 * Handles discount code creation for approved affiliates.
 * Uses the GraphQL Admin API with discountCodeBasicCreate mutation.
 *
 * Authentication: Uses an offline access token obtained via the
 * Authorization Code Grant flow and stored in the shopify_tokens table.
 */

import { createServerClient } from "@/lib/supabase";

interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion: string;
}

interface CreateDiscountResult {
  success: boolean;
  discountId?: string;
  code?: string;
  error?: string;
}

export class ShopifyClient {
  private config: ShopifyConfig;

  constructor(config: ShopifyConfig) {
    this.config = config;
  }

  private get graphqlUrl(): string {
    return `https://${this.config.shopDomain}/admin/api/${this.config.apiVersion}/graphql.json`;
  }

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.config.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Shopify GraphQL error:", response.status, errorText);
      throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.errors?.length) {
      const errorMsg = result.errors.map((e: { message: string }) => e.message).join(", ");
      console.error("Shopify GraphQL errors:", result.errors);
      throw new Error(`Shopify GraphQL error: ${errorMsg}`);
    }

    return result.data;
  }

  /**
   * Create a discount code using the GraphQL Admin API.
   * Supports both one-time purchases and subscriptions.
   */
  async createDiscountCode(params: {
    title: string;
    code: string;
    discountPercentage: number;
    appliesOncePerCustomer?: boolean;
    appliesOnSubscription?: boolean;
    appliesOnOneTimePurchase?: boolean;
    combinesWithProductDiscounts?: boolean;
    combinesWithShippingDiscounts?: boolean;
    combinesWithOrderDiscounts?: boolean;
  }): Promise<{ id: string; code: string }> {
    const mutation = `
      mutation CreateDiscountCode($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
              }
            }
          }
          userErrors {
            field
            code
            message
          }
        }
      }
    `;

    const variables = {
      basicCodeDiscount: {
        title: params.title,
        code: params.code.toUpperCase(),
        startsAt: new Date().toISOString(),
        appliesOncePerCustomer: params.appliesOncePerCustomer ?? true,
        customerSelection: {
          all: true,
        },
        customerGets: {
          value: {
            percentage: params.discountPercentage / 100,
          },
          items: {
            all: true,
          },
          appliesOnSubscription: params.appliesOnSubscription ?? true,
          appliesOnOneTimePurchase: params.appliesOnOneTimePurchase ?? true,
        },
        combinesWith: {
          productDiscounts: params.combinesWithProductDiscounts ?? true,
          shippingDiscounts: params.combinesWithShippingDiscounts ?? true,
          orderDiscounts: params.combinesWithOrderDiscounts ?? false,
        },
      },
    };

    const data = await this.graphql<{
      discountCodeBasicCreate: {
        codeDiscountNode: {
          id: string;
          codeDiscount: {
            title: string;
            codes: { nodes: { code: string }[] };
          };
        } | null;
        userErrors: { field: string[]; code: string; message: string }[];
      };
    }>(mutation, variables);

    const result = data.discountCodeBasicCreate;

    if (result.userErrors?.length) {
      const errorMsg = result.userErrors.map((e) => e.message).join(", ");
      throw new Error(`Shopify discount error: ${errorMsg}`);
    }

    if (!result.codeDiscountNode) {
      throw new Error("Shopify returned no discount node");
    }

    return {
      id: result.codeDiscountNode.id,
      code: result.codeDiscountNode.codeDiscount.codes.nodes[0]?.code || params.code.toUpperCase(),
    };
  }

  /**
   * Delete a discount code by its GID
   */
  async deleteDiscount(discountId: string): Promise<void> {
    const mutation = `
      mutation DeleteDiscount($id: ID!) {
        discountCodeDelete(id: $id) {
          deletedCodeDiscountId
          userErrors {
            field
            code
            message
          }
        }
      }
    `;

    const data = await this.graphql<{
      discountCodeDelete: {
        deletedCodeDiscountId: string | null;
        userErrors: { field: string[]; code: string; message: string }[];
      };
    }>(mutation, { id: discountId });

    if (data.discountCodeDelete.userErrors?.length) {
      const errorMsg = data.discountCodeDelete.userErrors.map((e) => e.message).join(", ");
      throw new Error(`Shopify delete error: ${errorMsg}`);
    }
  }

  /**
   * Look up a discount code to check if it already exists
   */
  async lookupDiscountCode(code: string): Promise<{ id: string; code: string } | null> {
    const query = `
      query LookupDiscount($query: String!) {
        codeDiscountNodes(first: 1, query: $query) {
          nodes {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
              }
              ... on DiscountCodeBxgy {
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
              }
              ... on DiscountCodeFreeShipping {
                codes(first: 1) {
                  nodes {
                    code
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const data = await this.graphql<{
        codeDiscountNodes: {
          nodes: {
            id: string;
            codeDiscount: {
              codes: { nodes: { code: string }[] };
            };
          }[];
        };
      }>(query, { query: `code:${code}` });

      const node = data.codeDiscountNodes.nodes[0];
      if (!node) return null;

      return {
        id: node.id,
        code: node.codeDiscount.codes.nodes[0]?.code || code,
      };
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
 *
 * Discount behavior:
 * - Works on both one-time purchases and subscriptions
 * - Can be combined with product and shipping discounts
 * - Each customer can only use it once
 * - Unlimited total uses across all customers
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
    const discount = await client.createDiscountCode({
      title: `Affiliate - ${affiliateName} (${referralCode})`,
      code: referralCode,
      discountPercentage,
      appliesOncePerCustomer: true,
      appliesOnSubscription: true,
      appliesOnOneTimePurchase: true,
      combinesWithProductDiscounts: true,
      combinesWithShippingDiscounts: true,
      combinesWithOrderDiscounts: false,
    });

    return {
      success: true,
      discountId: discount.id,
      code: discount.code,
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
  discountId: string
): Promise<{ success: boolean; error?: string }> {
  const client = await getShopifyClient();

  if (!client) {
    return {
      success: false,
      error: "Shopify not connected. Visit /api/shopify/install to connect.",
    };
  }

  try {
    await client.deleteDiscount(discountId);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete Shopify discount:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Shopify error",
    };
  }
}
