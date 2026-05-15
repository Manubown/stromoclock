import { NextResponse, type NextRequest } from "next/server";
import { fetchDayAheadPrices } from "@/lib/prices";
import { isZone } from "@/lib/entsoe/zones";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const zoneParam = req.nextUrl.searchParams.get("zone");
  if (!zoneParam || !isZone(zoneParam)) {
    return NextResponse.json({ error: "invalid_zone" }, { status: 400 });
  }

  try {
    const prices = await fetchDayAheadPrices(zoneParam);
    return NextResponse.json({ zone: zoneParam, prices });
  } catch (err) {
    console.error("[prices] fetch failed", err);
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }
}
