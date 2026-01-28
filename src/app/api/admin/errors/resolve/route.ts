import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { resolveError } from "@/lib/error-log";

const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(",") || [];

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { errorId, notes } = await request.json();

  if (!errorId) {
    return NextResponse.json({ error: "Missing error ID" }, { status: 400 });
  }

  const success = await resolveError(errorId, userId, notes);

  if (!success) {
    return NextResponse.json(
      { error: "Failed to resolve error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
