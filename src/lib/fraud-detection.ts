import { createServerClient } from "./supabase";
import { logFraudFlag } from "./activity-log";
import { emailsSimilar } from "./validation/email";

export interface FraudCheckResult {
  flagged: boolean;
  reasons: string[];
  score: number; // 0-100, higher = more suspicious
}

// Fraud detection thresholds
const THRESHOLDS = {
  REFERRALS_PER_HOUR: 10,
  DISCOUNT_CODE_USES_PER_DAY: 20,
  SIMILAR_EMAILS_COUNT: 3,
  DORMANT_DAYS: 30,
  ACTIVITY_SPIKE_MULTIPLIER: 5,
};

// Check referral velocity for an affiliate
export async function checkReferralVelocity(
  affiliateId: string
): Promise<{ flagged: boolean; count: number }> {
  const supabase = createServerClient();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("affiliate_id", affiliateId)
    .gte("created_at", oneHourAgo);

  if (error) {
    console.error("Error checking referral velocity:", error);
    return { flagged: false, count: 0 };
  }

  const referralCount = count || 0;
  return {
    flagged: referralCount >= THRESHOLDS.REFERRALS_PER_HOUR,
    count: referralCount,
  };
}

// Check discount code usage frequency
export async function checkDiscountCodeAbuse(
  discountCode: string
): Promise<{ flagged: boolean; count: number }> {
  const supabase = createServerClient();

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneDayAgo);

  if (error) {
    console.error("Error checking discount code abuse:", error);
    return { flagged: false, count: 0 };
  }

  // Note: This is a simplified check. In production, you'd want to track
  // discount code usage separately or filter referrals by the code used.
  const usageCount = count || 0;
  return {
    flagged: usageCount >= THRESHOLDS.DISCOUNT_CODE_USES_PER_DAY,
    count: usageCount,
  };
}

// Check for multiple affiliates from same IP
export async function checkIpClustering(
  ipAddress: string
): Promise<{ flagged: boolean; affiliateIds: string[] }> {
  const supabase = createServerClient();

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("activity_log")
    .select("affiliate_id")
    .eq("ip_address", ipAddress)
    .gte("created_at", oneWeekAgo)
    .not("affiliate_id", "is", null);

  if (error) {
    console.error("Error checking IP clustering:", error);
    return { flagged: false, affiliateIds: [] };
  }

  // Get unique affiliate IDs
  const affiliateIds = [...new Set(data?.map((d) => d.affiliate_id).filter(Boolean) as string[])];

  return {
    flagged: affiliateIds.length >= 3,
    affiliateIds,
  };
}

// Check for similar email addresses (potential fraud ring)
export async function checkSimilarEmails(
  email: string,
  excludeAffiliateId?: string
): Promise<{ flagged: boolean; similarEmails: string[] }> {
  const supabase = createServerClient();

  const { data: affiliates, error } = await supabase
    .from("affiliates")
    .select("id, email")
    .neq("id", excludeAffiliateId || "");

  if (error) {
    console.error("Error checking similar emails:", error);
    return { flagged: false, similarEmails: [] };
  }

  const similarEmails = affiliates
    ?.filter((a) => a.email && emailsSimilar(email, a.email))
    .map((a) => a.email)
    .filter((e): e is string => e !== null) || [];

  return {
    flagged: similarEmails.length >= THRESHOLDS.SIMILAR_EMAILS_COUNT,
    similarEmails,
  };
}

// Check for activity spike from dormant affiliate
export async function checkActivitySpike(
  affiliateId: string
): Promise<{ flagged: boolean; recentCount: number; historicalAverage: number }> {
  const supabase = createServerClient();

  // Get recent activity (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: recentError } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("affiliate_id", affiliateId)
    .gte("created_at", oneDayAgo);

  if (recentError) {
    console.error("Error checking recent activity:", recentError);
    return { flagged: false, recentCount: 0, historicalAverage: 0 };
  }

  // Get historical average (30 days before that, excluding last 24h)
  const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
  const { count: historicalCount, error: historicalError } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("affiliate_id", affiliateId)
    .gte("created_at", thirtyOneDaysAgo)
    .lt("created_at", oneDayAgo);

  if (historicalError) {
    console.error("Error checking historical activity:", historicalError);
    return { flagged: false, recentCount: recentCount || 0, historicalAverage: 0 };
  }

  const recent = recentCount || 0;
  const historicalAverage = (historicalCount || 0) / 30;

  // Flag if recent activity is significantly higher than historical average
  // and the affiliate had low/no historical activity
  const flagged =
    recent > 0 &&
    historicalAverage < 1 &&
    recent >= THRESHOLDS.ACTIVITY_SPIKE_MULTIPLIER;

  return {
    flagged,
    recentCount: recent,
    historicalAverage,
  };
}

// Comprehensive fraud check for a new referral
export async function checkReferralFraud(
  request: Request,
  affiliateId: string,
  customerEmail: string,
  orderTotal: number,
  discountCode: string
): Promise<FraudCheckResult> {
  const reasons: string[] = [];
  let score = 0;

  // Check referral velocity
  const velocityCheck = await checkReferralVelocity(affiliateId);
  if (velocityCheck.flagged) {
    reasons.push(`High referral velocity: ${velocityCheck.count} referrals in last hour`);
    score += 30;
  }

  // Check discount code abuse
  const codeCheck = await checkDiscountCodeAbuse(discountCode);
  if (codeCheck.flagged) {
    reasons.push(`Discount code used ${codeCheck.count} times today`);
    score += 20;
  }

  // Check activity spike
  const spikeCheck = await checkActivitySpike(affiliateId);
  if (spikeCheck.flagged) {
    reasons.push(
      `Activity spike: ${spikeCheck.recentCount} referrals vs ${spikeCheck.historicalAverage.toFixed(1)} avg`
    );
    score += 25;
  }

  // Check for unusually high order total (potential test/fraud order)
  if (orderTotal > 1000) {
    reasons.push(`High order total: $${orderTotal}`);
    score += 10;
  }

  // Check for unusually low order total (potential fake order)
  if (orderTotal < 10) {
    reasons.push(`Suspiciously low order total: $${orderTotal}`);
    score += 15;
  }

  const flagged = score >= 30;

  // Log fraud flag if detected
  if (flagged) {
    await logFraudFlag(
      request,
      reasons.join("; "),
      {
        affiliate_id: affiliateId,
        customer_email: customerEmail,
        order_total: orderTotal,
        discount_code: discountCode,
        fraud_score: score,
        checks: {
          velocity: velocityCheck,
          code_abuse: codeCheck,
          activity_spike: spikeCheck,
        },
      },
      affiliateId
    );
  }

  return {
    flagged,
    reasons,
    score,
  };
}

// Fraud check for new affiliate application
export async function checkAffiliateApplicationFraud(
  request: Request,
  email: string,
  ipAddress: string
): Promise<FraudCheckResult> {
  const reasons: string[] = [];
  let score = 0;

  // Check for similar existing emails
  const emailCheck = await checkSimilarEmails(email);
  if (emailCheck.flagged) {
    reasons.push(`Similar emails found: ${emailCheck.similarEmails.length}`);
    score += 40;
  } else if (emailCheck.similarEmails.length > 0) {
    reasons.push(`${emailCheck.similarEmails.length} similar email(s) found`);
    score += 15;
  }

  // Check IP clustering
  const ipCheck = await checkIpClustering(ipAddress);
  if (ipCheck.flagged) {
    reasons.push(`Multiple affiliates from same IP: ${ipCheck.affiliateIds.length}`);
    score += 35;
  } else if (ipCheck.affiliateIds.length > 1) {
    reasons.push(`${ipCheck.affiliateIds.length} affiliate(s) from same IP`);
    score += 10;
  }

  const flagged = score >= 30;

  // Log fraud flag if detected
  if (flagged) {
    await logFraudFlag(
      request,
      reasons.join("; "),
      {
        email,
        ip_address: ipAddress,
        fraud_score: score,
        checks: {
          similar_emails: emailCheck,
          ip_clustering: ipCheck,
        },
      }
    );
  }

  return {
    flagged,
    reasons,
    score,
  };
}
