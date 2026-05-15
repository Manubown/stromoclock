import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { priceCache } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { awattarSupports, fetchAwattarPrices } from "@/lib/awattar/client";
import { fetchEntsoePrices } from "@/lib/entsoe/client";
import type { HourlyPrice } from "@/lib/entsoe/parse";
import type { Zone } from "@/lib/entsoe/zones";

export type Provider = "awattar" | "entsoe";

export function providerFor(zone: Zone): Provider {
  return awattarSupports(zone) ? "awattar" : "entsoe";
}

export type PriceWindow = {
  startIndex: number;
  endIndex: number; // inclusive
  start: string;
  end: string;
  avgEurPerMWh: number;
  hours: number;
};

/**
 * Find the contiguous N-hour window with the lowest (or highest) average price.
 * Default 3h matches typical appliance runtimes (dishwasher, laundry).
 */
export function findWindow(
  prices: HourlyPrice[],
  hours: number,
  kind: "cheapest" | "most-expensive",
): PriceWindow | null {
  if (prices.length < hours) return null;
  let bestIdx = 0;
  let bestSum = 0;
  for (let i = 0; i < hours; i++) bestSum += prices[i].eurPerMWh;
  let runningSum = bestSum;

  for (let i = 1; i <= prices.length - hours; i++) {
    runningSum = runningSum - prices[i - 1].eurPerMWh + prices[i + hours - 1].eurPerMWh;
    const better =
      kind === "cheapest" ? runningSum < bestSum : runningSum > bestSum;
    if (better) {
      bestSum = runningSum;
      bestIdx = i;
    }
  }

  return {
    startIndex: bestIdx,
    endIndex: bestIdx + hours - 1,
    start: prices[bestIdx].start,
    end: prices[bestIdx + hours - 1].end,
    avgEurPerMWh: bestSum / hours,
    hours,
  };
}

function isoDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export class MissingEntsoeTokenError extends Error {
  constructor(zone: Zone) {
    super(`Zone ${zone} requires an ENTSO-E API token. Set ENTSOE_API_TOKEN in .env.local.`);
    this.name = "MissingEntsoeTokenError";
  }
}

/**
 * Fetch the next 24h of day-ahead prices for a bidding zone, routing
 * to aWATTar (AT, DE-LU) or ENTSO-E (everything else). Cached per
 * (zone, date) in Postgres so repeat views don't hit upstream.
 */
export async function fetchDayAheadPrices(zone: Zone, anchor: Date = new Date()): Promise<HourlyPrice[]> {
  const cacheDate = isoDate(anchor);

  const cached = await db
    .select()
    .from(priceCache)
    .where(and(eq(priceCache.zone, zone), eq(priceCache.date, cacheDate)))
    .limit(1);

  if (cached[0]) {
    return cached[0].payload as HourlyPrice[];
  }

  const provider = providerFor(zone);
  let prices: HourlyPrice[];

  if (provider === "awattar") {
    prices = await fetchAwattarPrices(zone, anchor);
  } else {
    if (!env.ENTSOE_API_TOKEN) throw new MissingEntsoeTokenError(zone);
    prices = await fetchEntsoePrices(zone, anchor);
  }

  await db
    .insert(priceCache)
    .values({ zone, date: cacheDate, payload: prices })
    .onConflictDoNothing();

  return prices;
}
