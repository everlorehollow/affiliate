import { NextRequest, NextResponse } from "next/server";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import { extractClientIp } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "CAPTCHA token is required" },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(request);
    const result = await verifyHCaptcha(token, clientIp);

    if (result.success) {
      return NextResponse.json({
        success: true,
        timestamp: result.timestamp,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify CAPTCHA" },
      { status: 500 }
    );
  }
}
