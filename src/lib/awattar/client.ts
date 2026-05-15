import type { HourlyPrice } from "@/lib/entsoe/parse";
import type { Zone } from "@/lib/entsoe/zones";

const HOSTS: Partial<Record<Zone, string>> = {
  AT: "https://api.awattar.at",
  "DE-LU": "https://api.awattar.de",
};

export function awattarSupports(zone: Zone): boolean {
  return zone in HOSTS;
}

type AwattarResponse = {
  data: Array<{
    start_timestamp: number;
    end_timestamp: number;
    marketprice: number;
    unit: string;
  }>;
};

/**
 * Fetch ≥24h of day-ahead prices from aWATTar (AT or DE-LU).
 * No auth required. Returns prices in chronological order.
 */
export async function fetchAwattarPrices(zone: Zone, anchor: Date): Promise<HourlyPrice[]> {
  const host = HOSTS[zone];
  if (!host) throw new Error(`aWATTar does not support zone ${zone}`);

  const periodStart = new Date(anchor);
  periodStart.setUTCMinutes(0, 0, 0);
  const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);

  const url = new URL(`${host}/v1/marketdata`);
  url.searchParams.set("start", periodStart.getTime().toString());
  url.searchParams.set("end", periodEnd.getTime().toString());

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`aWATTar request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as AwattarResponse;

  return json.data
    .map((d) => ({
      start: new Date(d.start_timestamp).toISOString(),
      end: new Date(d.end_timestamp).toISOString(),
      eurPerMWh: d.marketprice,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}
