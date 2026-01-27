import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// Simple test endpoint that logs all incoming requests
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers: Record<string, string> = {};

  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const supabase = createServerClient();

  // Log to activity_log table for debugging
  await supabase.from("activity_log").insert({
    action: "webhook_test",
    details: {
      body: body.substring(0, 1000), // First 1000 chars
      headers: headers,
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json({
    received: true,
    timestamp: new Date().toISOString()
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Webhook test endpoint is live"
  });
}
