/**
 * Klaviyo API Client
 * Documentation: https://developers.klaviyo.com/
 *
 * Handles event tracking for affiliate activities:
 * - Affiliate Signed Up
 * - Affiliate Approved
 * - Affiliate Referral
 * - Affiliate Tier Upgrade
 * - Affiliate Payout Sent
 */

const KLAVIYO_API_URL = "https://a.klaviyo.com/api";

interface KlaviyoProfile {
  email: string;
  first_name?: string;
  last_name?: string;
  properties?: Record<string, unknown>;
}

interface KlaviyoEventData {
  metric: string;
  profile: KlaviyoProfile;
  properties?: Record<string, unknown>;
  time?: string;
}

class KlaviyoClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, data: unknown): Promise<Response> {
    const response = await fetch(`${KLAVIYO_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Klaviyo-API-Key ${this.apiKey}`,
        "revision": "2024-02-15",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Klaviyo API error:", response.status, errorText);
      throw new Error(`Klaviyo API error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  async trackEvent(eventData: KlaviyoEventData): Promise<void> {
    const payload = {
      data: {
        type: "event",
        attributes: {
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: eventData.metric,
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: eventData.profile.email,
                first_name: eventData.profile.first_name,
                last_name: eventData.profile.last_name,
                properties: eventData.profile.properties,
              },
            },
          },
          properties: eventData.properties || {},
          time: eventData.time || new Date().toISOString(),
        },
      },
    };

    await this.request("/events/", payload);
  }

  // Affiliate signed up (pending approval)
  async trackAffiliateSignedUp(affiliate: {
    email: string;
    first_name?: string;
    last_name?: string;
    referral_code: string;
    instagram_handle?: string;
    tiktok_handle?: string;
    youtube_channel?: string;
    website_url?: string;
  }): Promise<void> {
    await this.trackEvent({
      metric: "Affiliate Signed Up",
      profile: {
        email: affiliate.email,
        first_name: affiliate.first_name,
        last_name: affiliate.last_name,
        properties: {
          affiliate_status: "pending",
          referral_code: affiliate.referral_code,
        },
      },
      properties: {
        referral_code: affiliate.referral_code,
        instagram_handle: affiliate.instagram_handle,
        tiktok_handle: affiliate.tiktok_handle,
        youtube_channel: affiliate.youtube_channel,
        website_url: affiliate.website_url,
        signup_date: new Date().toISOString(),
      },
    });
  }

  // Affiliate approved
  async trackAffiliateApproved(affiliate: {
    email: string;
    first_name?: string;
    last_name?: string;
    referral_code: string;
    tier: string;
    commission_rate: number;
  }): Promise<void> {
    await this.trackEvent({
      metric: "Affiliate Approved",
      profile: {
        email: affiliate.email,
        first_name: affiliate.first_name,
        last_name: affiliate.last_name,
        properties: {
          affiliate_status: "approved",
          affiliate_tier: affiliate.tier,
          affiliate_commission_rate: affiliate.commission_rate,
          referral_code: affiliate.referral_code,
        },
      },
      properties: {
        referral_code: affiliate.referral_code,
        tier: affiliate.tier,
        commission_rate: affiliate.commission_rate,
        approved_date: new Date().toISOString(),
      },
    });
  }

  // New referral/sale
  async trackAffiliateReferral(data: {
    affiliate: {
      email: string;
      first_name?: string;
      last_name?: string;
      referral_code: string;
      tier: string;
    };
    referral: {
      id: string;
      order_number: string;
      order_subtotal: number;
      order_total: number;
      commission_amount: number;
      commission_rate: number;
      is_recurring: boolean;
      order_source: string;
    };
    customer_email: string;
  }): Promise<void> {
    await this.trackEvent({
      metric: "Affiliate Referral",
      profile: {
        email: data.affiliate.email,
        first_name: data.affiliate.first_name,
        last_name: data.affiliate.last_name,
      },
      properties: {
        referral_id: data.referral.id,
        order_number: data.referral.order_number,
        order_subtotal: data.referral.order_subtotal,
        order_total: data.referral.order_total,
        commission_amount: data.referral.commission_amount,
        commission_rate: data.referral.commission_rate,
        is_recurring: data.referral.is_recurring,
        order_source: data.referral.order_source,
        customer_email: data.customer_email,
        referral_code: data.affiliate.referral_code,
        tier: data.affiliate.tier,
      },
    });
  }

  // Tier upgrade
  async trackAffiliateTierUpgrade(affiliate: {
    email: string;
    first_name?: string;
    last_name?: string;
    referral_code: string;
    old_tier: string;
    new_tier: string;
    old_commission_rate: number;
    new_commission_rate: number;
    total_referrals: number;
  }): Promise<void> {
    await this.trackEvent({
      metric: "Affiliate Tier Upgrade",
      profile: {
        email: affiliate.email,
        first_name: affiliate.first_name,
        last_name: affiliate.last_name,
        properties: {
          affiliate_tier: affiliate.new_tier,
          affiliate_commission_rate: affiliate.new_commission_rate,
          referral_code: affiliate.referral_code,
        },
      },
      properties: {
        referral_code: affiliate.referral_code,
        old_tier: affiliate.old_tier,
        new_tier: affiliate.new_tier,
        old_commission_rate: affiliate.old_commission_rate,
        new_commission_rate: affiliate.new_commission_rate,
        total_referrals: affiliate.total_referrals,
        upgrade_date: new Date().toISOString(),
      },
    });
  }

  // Payout sent
  async trackAffiliatePayoutSent(data: {
    affiliate: {
      email: string;
      first_name?: string;
      last_name?: string;
      referral_code: string;
    };
    payout: {
      id: string;
      amount: number;
      method: string;
      paypal_email?: string;
    };
  }): Promise<void> {
    await this.trackEvent({
      metric: "Affiliate Payout Sent",
      profile: {
        email: data.affiliate.email,
        first_name: data.affiliate.first_name,
        last_name: data.affiliate.last_name,
      },
      properties: {
        payout_id: data.payout.id,
        payout_amount: data.payout.amount,
        payout_method: data.payout.method,
        paypal_email: data.payout.paypal_email,
        referral_code: data.affiliate.referral_code,
        payout_date: new Date().toISOString(),
      },
    });
  }
}

// Singleton instance
let klaviyoClient: KlaviyoClient | null = null;

export function getKlaviyoClient(): KlaviyoClient | null {
  const apiKey = process.env.KLAVIYO_API_KEY;

  if (!apiKey) {
    console.warn("Klaviyo API key not configured - events will not be tracked");
    return null;
  }

  if (!klaviyoClient) {
    klaviyoClient = new KlaviyoClient(apiKey);
  }

  return klaviyoClient;
}

// Helper function for safe event tracking (won't throw if Klaviyo not configured)
export async function trackKlaviyoEvent(
  trackFn: (client: KlaviyoClient) => Promise<void>
): Promise<void> {
  const client = getKlaviyoClient();
  if (!client) return;

  try {
    await trackFn(client);
  } catch (error) {
    console.error("Failed to track Klaviyo event:", error);
    // Don't throw - Klaviyo failures shouldn't break the main flow
  }
}
