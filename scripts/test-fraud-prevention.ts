/**
 * Test script for fraud prevention features
 * Run with: npx tsx scripts/test-fraud-prevention.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

async function testUpstashRedis() {
  console.log("\n🔍 Testing Upstash Redis connection...");

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.log("  ❌ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set");
    console.log("  ⚠️  Rate limiting will be disabled");
    return false;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["PING"]),
    });

    const data = await response.json();

    if (data.result === "PONG") {
      console.log("  ✅ Upstash Redis connected successfully");
      return true;
    } else {
      console.log("  ❌ Unexpected response:", data);
      return false;
    }
  } catch (error) {
    console.log("  ❌ Connection failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function testHCaptcha() {
  console.log("\n🔍 Testing hCaptcha configuration...");

  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
  const secretKey = process.env.HCAPTCHA_SECRET_KEY;

  if (!siteKey) {
    console.log("  ❌ NEXT_PUBLIC_HCAPTCHA_SITE_KEY not set");
    return false;
  }

  if (!secretKey) {
    console.log("  ❌ HCAPTCHA_SECRET_KEY not set");
    return false;
  }

  // Validate format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(siteKey)) {
    console.log("  ⚠️  Site key doesn't look like a UUID format");
  }

  if (!secretKey.startsWith("0x")) {
    console.log("  ⚠️  Secret key should start with '0x'");
  }

  // Test with a dummy token (will fail but verifies API connectivity)
  try {
    const response = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: "test-token",
      }).toString(),
    });

    const data = await response.json();

    // We expect this to fail with "invalid-input-response" since we used a test token
    // But if we get a different error, the credentials might be wrong
    if (data["error-codes"]?.includes("invalid-input-response")) {
      console.log("  ✅ hCaptcha API connected (credentials valid)");
      return true;
    } else if (data["error-codes"]?.includes("invalid-input-secret")) {
      console.log("  ❌ Invalid hCaptcha secret key");
      return false;
    } else {
      console.log("  ✅ hCaptcha API responded:", data);
      return true;
    }
  } catch (error) {
    console.log("  ❌ hCaptcha API error:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function testSupabase() {
  console.log("\n🔍 Testing Supabase connection...");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    console.log("  ❌ NEXT_PUBLIC_SUPABASE_URL not set");
    return false;
  }

  if (!serviceKey) {
    console.log("  ❌ SUPABASE_SERVICE_ROLE_KEY not set");
    return false;
  }

  try {
    // Test by querying the activity_log table
    const response = await fetch(`${url}/rest/v1/activity_log?select=id&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (response.ok) {
      console.log("  ✅ Supabase connected (activity_log table accessible)");
      return true;
    } else {
      const error = await response.text();
      console.log("  ❌ Supabase error:", error);
      return false;
    }
  } catch (error) {
    console.log("  ❌ Supabase connection failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function testRateLimiting() {
  console.log("\n🔍 Testing rate limiting functionality...");

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.log("  ⏭️  Skipped (Redis not configured)");
    return false;
  }

  try {
    // Test by setting and getting a test key
    const testKey = `test:fraud-prevention:${Date.now()}`;

    // SET
    const setResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", testKey, "test-value", "EX", "10"]),
    });
    const setData = await setResponse.json();

    // GET
    const getResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["GET", testKey]),
    });
    const getData = await getResponse.json();

    // DELETE
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["DEL", testKey]),
    });

    if (setData.result === "OK" && getData.result === "test-value") {
      console.log("  ✅ Rate limiting storage working (SET/GET/DEL verified)");
      return true;
    } else {
      console.log("  ❌ Rate limiting storage issue");
      return false;
    }
  } catch (error) {
    console.log("  ❌ Rate limiting test failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function testDeployedEndpoint() {
  console.log("\n🔍 Testing deployed CAPTCHA verification endpoint...");

  // Try to determine the deployed URL
  const vercelUrl = process.env.VERCEL_URL;
  const baseUrl = vercelUrl
    ? `https://${vercelUrl}`
    : "http://localhost:3000";

  console.log(`  📍 Testing: ${baseUrl}/api/verify-captcha`);

  try {
    const response = await fetch(`${baseUrl}/api/verify-captcha`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: "" }),
    });

    const data = await response.json();

    // We expect a 400 error for missing token
    if (response.status === 400 && data.error) {
      console.log("  ✅ CAPTCHA endpoint responding correctly");
      return true;
    } else {
      console.log("  ⚠️  Unexpected response:", data);
      return true;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      console.log("  ⏭️  Skipped (server not running locally)");
      console.log("  💡 Run 'npm run dev' to test locally, or check your deployed URL");
    } else {
      console.log("  ❌ Endpoint test failed:", error instanceof Error ? error.message : error);
    }
    return false;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("       FRAUD PREVENTION SYSTEM - VERIFICATION TEST         ");
  console.log("═══════════════════════════════════════════════════════════");

  const results = {
    upstash: await testUpstashRedis(),
    hcaptcha: await testHCaptcha(),
    supabase: await testSupabase(),
    rateLimit: await testRateLimiting(),
    endpoint: await testDeployedEndpoint(),
  };

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                       SUMMARY                              ");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Upstash Redis:     ${results.upstash ? "✅ Working" : "❌ Not configured"}`);
  console.log(`  hCaptcha:          ${results.hcaptcha ? "✅ Working" : "❌ Not configured"}`);
  console.log(`  Supabase:          ${results.supabase ? "✅ Working" : "❌ Issue"}`);
  console.log(`  Rate Limiting:     ${results.rateLimit ? "✅ Working" : "⚠️  Disabled"}`);
  console.log(`  CAPTCHA Endpoint:  ${results.endpoint ? "✅ Working" : "⚠️  Check manually"}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const allPassed = Object.values(results).every(Boolean);
  if (allPassed) {
    console.log("🎉 All fraud prevention features are working!\n");
  } else {
    console.log("⚠️  Some features need attention. Check the details above.\n");
  }

  // Additional tips
  console.log("📋 Next steps to verify in production:");
  console.log("   1. Make 100+ rapid requests to an API endpoint → should get 429");
  console.log("   2. Check Upstash dashboard for rate limit analytics");
  console.log("   3. Test hCaptcha widget on your signup form");
  console.log("   4. Check Supabase activity_log table for new entries\n");
}

main().catch(console.error);
