import { NextRequest, NextResponse } from "next/server";
import { purgeTrash } from "@/lib/trash-manager";

export async function GET(req: NextRequest) {
  return handleCleanup(req);
}

export async function POST(req: NextRequest) {
  return handleCleanup(req);
}

async function handleCleanup(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Validate Secret
  if (
    !cronSecret ||
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized. Valid Bearer CRON_SECRET is required.",
      },
      { status: 401 }
    );
  }

  try {
    const result = await purgeTrash({ olderThanDays: 30 });

    return NextResponse.json({
      success: true,
      message: `Trash cleanup executed successfully. Purged ${result.purgedCount} expired items.`,
      purgedCount: result.purgedCount,
      errors: result.errors,
      executedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron trash cleanup failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during trash cleanup.",
      },
      { status: 500 }
    );
  }
}
