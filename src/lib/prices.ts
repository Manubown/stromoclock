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
  /** signed delta from the day's median price (negative for cheap windows, positive for expensive). */
  vsMedianEurPerMWh: number;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Adaptive window: across all contiguous N-hour windows for N in [minHours, maxHours],
 * pick the one that maximizes `(median - avg) * hours` for "cheapest" (and the mirror for
 * "most-expensive"). This balances "how cheap" against "how long" — on a day with one
 * spike low hour the window stays short; on a long cheap valley it grows wide. Bounded
 * at maxHours so a flat day doesn't span the whole 24h.
 *
 * Falls back to the single cheapest/most-expensive hour if no window beats the median
 * (rare — only on perfectly flat days).
 */
export function findAdaptiveWindow(
  prices: HourlyPrice[],
  kind: "cheapest" | "most-expensive",
  options: { minHours?: number; maxHours?: number } = {},
): PriceWindow | null {
  if (prices.length === 0) return null;
  const minH = Math.max(1, options.minHours ?? 1);
  const maxH = Math.min(options.maxHours ?? 8, prices.length);
  const medianMwh = median(prices.map((p) => p.eurPerMWh));

  let best: { startIdx: number; hours: number; avgMwh: number; score: number } | null = null;

  for (let h = minH; h <= maxH; h++) {
    let sum = 0;
    for (let i = 0; i < h; i++) sum += prices[i].eurPerMWh;
    for (let start = 0; start <= prices.length - h; start++) {
      if (start > 0) {
        sum = sum - prices[start - 1].eurPerMWh + prices[start + h - 1].eurPerMWh;
      }
      const avg = sum / h;
      const score = kind === "cheapest" ? (medianMwh - avg) * h : (avg - medianMwh) * h;
      if (score <= 0) continue;
      if (!best || score > best.score) {
        best = { startIdx: start, hours: h, avgMwh: avg, score };
      }
    }
  }

  if (!best) {
    // Perfectly flat / inverted day — fall back to the single best hour.
    let idx = 0;
    for (let i = 1; i < prices.length; i++) {
      const better =
        kind === "cheapest"
          ? prices[i].eurPerMWh < prices[idx].eurPerMWh
          : prices[i].eurPerMWh > prices[idx].eurPerMWh;
      if (better) idx = i;
    }
    return {
      startIndex: idx,
      endIndex: idx,
      start: prices[idx].start,
      end: prices[idx].end,
      avgEurPerMWh: prices[idx].eurPerMWh,
      hours: 1,
      vsMedianEurPerMWh: prices[idx].eurPerMWh - medianMwh,
    };
  }

  return {
    startIndex: best.startIdx,
    endIndex: best.startIdx + best.hours - 1,
    start: prices[best.startIdx].start,
    end: prices[best.startIdx + best.hours - 1].end,
    avgEurPerMWh: best.avgMwh,
    hours: best.hours,
    vsMedianEurPerMWh: best.avgMwh - medianMwh,
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
