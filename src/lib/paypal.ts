/**
 * PayPal Payouts API Client
 * Documentation: https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
 *
 * Handles batch payouts to affiliates via PayPal.
 * Uses OAuth 2.0 client credentials flow for authentication.
 */

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: "sandbox" | "live";
}

interface PayoutItem {
  recipient_type: "EMAIL" | "PHONE" | "PAYPAL_ID";
  amount: {
    value: string;
    currency: string;
  };
  receiver: string;
  note?: string;
  sender_item_id: string;
}

interface PayoutBatch {
  sender_batch_header: {
    sender_batch_id: string;
    email_subject: string;
    email_message?: string;
  };
  items: PayoutItem[];
}

interface PayoutBatchResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: string;
    sender_batch_header: {
      sender_batch_id: string;
      email_subject: string;
    };
  };
  links: Array<{ href: string; rel: string; method: string }>;
}

interface PayoutBatchStatusResponse {
  batch_header: {
    payout_batch_id: string;
    batch_status: "PENDING" | "PROCESSING" | "SUCCESS" | "DENIED" | "CANCELED";
    time_created: string;
    time_completed?: string;
    sender_batch_header: {
      sender_batch_id: string;
      email_subject: string;
    };
    amount: {
      value: string;
      currency: string;
    };
    fees: {
      value: string;
      currency: string;
    };
  };
  items: Array<{
    payout_item_id: string;
    transaction_id?: string;
    transaction_status: "SUCCESS" | "FAILED" | "PENDING" | "UNCLAIMED" | "RETURNED" | "ONHOLD" | "BLOCKED" | "REFUNDED" | "REVERSED";
    payout_batch_id: string;
    payout_item_fee: {
      value: string;
      currency: string;
    };
    payout_item: {
      recipient_type: string;
      amount: {
        value: string;
        currency: string;
      };
      receiver: string;
      sender_item_id: string;
    };
    errors?: {
      name: string;
      message: string;
    };
  }>;
}

export class PayPalClient {
  private config: PayPalConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: PayPalConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return this.config.mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  }

  /**
   * Get OAuth 2.0 access token using client credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64");

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("PayPal OAuth error:", response.status, error);
      throw new Error(`PayPal authentication failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;

    return this.accessToken!;
  }

  /**
   * Make an authenticated request to PayPal API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("PayPal API error:", response.status, errorText);
      throw new Error(`PayPal API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a batch payout
   */
  async createPayout(batch: PayoutBatch): Promise<PayoutBatchResponse> {
    return this.request<PayoutBatchResponse>(
      "POST",
      "/v1/payments/payouts",
      batch
    );
  }

  /**
   * Get payout batch status
   */
  async getPayoutStatus(payoutBatchId: string): Promise<PayoutBatchStatusResponse> {
    return this.request<PayoutBatchStatusResponse>(
      "GET",
      `/v1/payments/payouts/${payoutBatchId}`
    );
  }

  /**
   * Get individual payout item status
   */
  async getPayoutItemStatus(payoutItemId: string): Promise<PayoutBatchStatusResponse["items"][0]> {
    return this.request<PayoutBatchStatusResponse["items"][0]>(
      "GET",
      `/v1/payments/payouts-item/${payoutItemId}`
    );
  }
}

// Singleton instance
let paypalClient: PayPalClient | null = null;

export function getPayPalClient(): PayPalClient | null {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = (process.env.PAYPAL_MODE as "sandbox" | "live") || "sandbox";

  if (!clientId || !clientSecret) {
    console.warn("PayPal credentials not configured - payouts will not be processed");
    return null;
  }

  if (!paypalClient) {
    paypalClient = new PayPalClient({
      clientId,
      clientSecret,
      mode,
    });
  }

  return paypalClient;
}

/**
 * Helper to create a payout batch for affiliates
 */
export interface AffiliatePayoutData {
  affiliateId: string;
  email: string;
  paypalEmail: string;
  amount: number;
  referralCode: string;
}

export async function createAffiliatePayout(
  affiliates: AffiliatePayoutData[],
  batchId: string
): Promise<{ success: boolean; batchId?: string; error?: string }> {
  const client = getPayPalClient();

  if (!client) {
    return { success: false, error: "PayPal not configured" };
  }

  // Validate all affiliates have PayPal emails
  const missingEmails = affiliates.filter((a) => !a.paypalEmail);
  if (missingEmails.length > 0) {
    return {
      success: false,
      error: `Missing PayPal emails for: ${missingEmails.map((a) => a.referralCode).join(", ")}`,
    };
  }

  const payoutBatch: PayoutBatch = {
    sender_batch_header: {
      sender_batch_id: `everlore_${batchId}_${Date.now()}`,
      email_subject: "Your Everlore Hollow affiliate payout",
      email_message: "Thank you for being part of the Everlore Hollow affiliate program!",
    },
    items: affiliates.map((affiliate) => ({
      recipient_type: "EMAIL" as const,
      amount: {
        value: affiliate.amount.toFixed(2),
        currency: "USD",
      },
      receiver: affiliate.paypalEmail,
      note: `Commission payout for affiliate ${affiliate.referralCode}`,
      sender_item_id: affiliate.affiliateId,
    })),
  };

  try {
    const response = await client.createPayout(payoutBatch);
    return {
      success: true,
      batchId: response.batch_header.payout_batch_id,
    };
  } catch (error) {
    console.error("PayPal payout error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown PayPal error",
    };
  }
}

/**
 * Map PayPal batch status to our internal status
 */
export function mapPayPalStatus(
  paypalStatus: string
): "pending" | "processing" | "completed" | "failed" {
  switch (paypalStatus) {
    case "SUCCESS":
      return "completed";
    case "DENIED":
    case "CANCELED":
      return "failed";
    case "PENDING":
    case "PROCESSING":
    default:
      return "processing";
  }
}

/**
 * Map PayPal item status to determine if it succeeded
 */
export function isPayoutItemSuccess(transactionStatus: string): boolean {
  return transactionStatus === "SUCCESS";
}

/**
 * Map PayPal item status to our internal status
 */
export function mapPayPalItemStatus(
  transactionStatus: string
): "pending" | "processing" | "completed" | "failed" {
  switch (transactionStatus) {
    case "SUCCESS":
      return "completed";
    case "FAILED":
    case "RETURNED":
    case "BLOCKED":
    case "REFUNDED":
    case "REVERSED":
      return "failed";
    case "UNCLAIMED":
    case "ONHOLD":
    case "PENDING":
    default:
      return "processing";
  }
}

/**
 * Check status of a payout batch and return item-level details
 */
export async function checkPayoutBatchStatus(
  batchId: string
): Promise<{
  success: boolean;
  batchStatus?: string;
  items?: Array<{
    affiliateId: string;
    payoutItemId: string;
    transactionStatus: string;
    internalStatus: "pending" | "processing" | "completed" | "failed";
    error?: string;
  }>;
  error?: string;
}> {
  const client = getPayPalClient();

  if (!client) {
    return { success: false, error: "PayPal not configured" };
  }

  try {
    const response = await client.getPayoutStatus(batchId);

    const items = response.items.map((item) => ({
      affiliateId: item.payout_item.sender_item_id,
      payoutItemId: item.payout_item_id,
      transactionStatus: item.transaction_status,
      internalStatus: mapPayPalItemStatus(item.transaction_status),
      error: item.errors?.message,
    }));

    return {
      success: true,
      batchStatus: response.batch_header.batch_status,
      items,
    };
  } catch (error) {
    console.error("PayPal status check error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown PayPal error",
    };
  }
}
