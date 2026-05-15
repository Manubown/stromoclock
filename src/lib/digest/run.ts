import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { digestSends, users } from "@/lib/db/schema";
import { isZone, type Zone } from "@/lib/entsoe/zones";
import { fetchDayAheadPrices, providerFor } from "@/lib/prices";
import { sendDigestEmail } from "@/lib/digest/send";

export type DigestRunResult = {
  sendDate: string;
  attempted: number;
  sent: number;
  skipped: number;
  errors: Array<{ userId: string; error: string }>;
};

/**
 * Anchor for "tomorrow's prices" expressed as midnight UTC of the next
 * UTC calendar day. At the 14:00 CET / 15:00 CEST cron time this lands
 * cleanly inside tomorrow's day-ahead window for both winter and summer
 * (1–2h drift relative to Berlin midnight, but day-ahead data covers
 * the full UTC day, so prices for the user's perceived "tomorrow" are
 * still all present).
 */
function tomorrowUtcMidnight(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function isoDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export async function runDailyDigest(now: Date = new Date()): Promise<DigestRunResult> {
  const anchor = tomorrowUtcMidnight(now);
  const sendDate = isoDate(anchor);

  const subscribers = await db
    .select({ id: users.id, email: users.email, zone: users.zone })
    .from(users)
    .where(and(isNotNull(users.zone), eq(users.digestEnabled, true)));

  const result: DigestRunResult = {
    sendDate,
    attempted: subscribers.length,
    sent: 0,
    skipped: 0,
    errors: [],
  };

  // Group by zone so we fetch each zone's prices once.
  const byZone = new Map<Zone, typeof subscribers>();
  for (const u of subscribers) {
    if (!u.zone || !isZone(u.zone)) continue;
    const list = byZone.get(u.zone) ?? [];
    list.push(u);
    byZone.set(u.zone, list);
  }

  for (const [zone, recipients] of byZone) {
    let prices;
    try {
      prices = await fetchDayAheadPrices(zone, anchor);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (const u of recipients) result.errors.push({ userId: u.id, error: `fetch: ${msg}` });
      continue;
    }
    if (prices.length === 0) {
      for (const u of recipients) result.errors.push({ userId: u.id, error: "no prices published yet" });
      continue;
    }

    const payload = { zone, provider: providerFor(zone), prices };

    for (const u of recipients) {
      try {
        // Idempotency: insert first with ON CONFLICT DO NOTHING; if returning is empty, someone already sent today.
        const claimed = await db
          .insert(digestSends)
          .values({ userId: u.id, sendDate })
          .onConflictDoNothing()
          .returning({ userId: digestSends.userId });

        if (claimed.length === 0) {
          result.skipped += 1;
          continue;
        }

        await sendDigestEmail(u.email, payload);
        result.sent += 1;
      } catch (err) {
        // Roll back the claim so the next run retries this user.
        await db
          .delete(digestSends)
          .where(and(eq(digestSends.userId, u.id), eq(digestSends.sendDate, sendDate)));
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push({ userId: u.id, error: `send: ${msg}` });
      }
    }
  }

  return result;
}
