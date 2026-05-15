import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { runDailyDigest } from "@/lib/digest/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runDailyDigest();
  console.log("[cron] daily-digest", result);
  return NextResponse.json(result);
}
