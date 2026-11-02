import { drainStorageCleanup } from "@/lib/storage-cleanup";
import { NextRequest, NextResponse } from "next/server";
import { drainTelegramOutbox } from "@/lib/telegram";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [telegram, cleanup] = await Promise.allSettled([drainTelegramOutbox(), drainStorageCleanup()]);
  return NextResponse.json({
    telegram: telegram.status === "fulfilled" ? telegram.value : { error: "Telegram worker failed; queued events retained." },
    cleanup: cleanup.status === "fulfilled" ? cleanup.value : { error: "Cleanup worker failed; jobs retained." },
  }, { status: telegram.status === "rejected" || cleanup.status === "rejected" ? 503 : 200 });
}
export const POST = GET;
