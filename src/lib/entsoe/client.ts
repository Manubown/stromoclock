import { env } from "@/lib/env";
import { eicFor, type Zone } from "@/lib/entsoe/zones";
import { parseDayAheadXml, type HourlyPrice } from "@/lib/entsoe/parse";

const ENTSOE_ENDPOINT = "https://web-api.tp.entsoe.eu/api";

function fmtPeriod(d: Date): string {
  // YYYYMMDDHHmm in UTC
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes())
  );
}

/**
 * Fetch ≥24h of day-ahead prices from ENTSO-E Transparency Platform.
 * Requires ENTSOE_API_TOKEN. Caller is responsible for caching.
 */
export async function fetchEntsoePrices(zone: Zone, anchor: Date): Promise<HourlyPrice[]> {
  if (!env.ENTSOE_API_TOKEN) {
    throw new Error("ENTSOE_API_TOKEN is not configured.");
  }

  const periodStart = new Date(anchor);
  periodStart.setUTCMinutes(0, 0, 0);
  const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);

  const eic = eicFor(zone);
  const url = new URL(ENTSOE_ENDPOINT);
  url.searchParams.set("documentType", "A44");
  url.searchParams.set("in_Domain", eic);
  url.searchParams.set("out_Domain", eic);
  url.searchParams.set("periodStart", fmtPeriod(periodStart));
  url.searchParams.set("periodEnd", fmtPeriod(periodEnd));
  url.searchParams.set("securityToken", env.ENTSOE_API_TOKEN);

  const res = await fetch(url, { headers: { Accept: "application/xml" } });
  if (!res.ok) {
    throw new Error(`ENTSO-E request failed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  return parseDayAheadXml(xml);
}
