"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { isZone, type Zone } from "@/lib/entsoe/zones";
import { fetchDayAheadPrices, providerFor } from "@/lib/prices";
import { sendDigestEmail } from "@/lib/digest/send";

export async function completeOnboarding(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("unauthorized");

  const zoneInput = formData.get("zone");
  if (typeof zoneInput !== "string" || !isZone(zoneInput)) {
    throw new Error("invalid_zone");
  }
  const zone: Zone = zoneInput;
  const digestEnabled = formData.get("digest") === "on";

  await db
    .update(users)
    .set({ zone, digestEnabled })
    .where(eq(users.id, user.id));

  if (digestEnabled) {
    // Fire a welcome email with the next-24h prices. Best-effort: a failure
    // here must NOT block the onboarding redirect — the user already chose
    // their settings and they're saved.
    try {
      const prices = await fetchDayAheadPrices(zone);
      if (prices.length > 0) {
        await sendDigestEmail(user.email, {
          zone,
          provider: providerFor(zone),
          prices,
          kind: "welcome",
        });
      }
    } catch (err) {
      console.error("[onboarding] welcome email failed:", err);
    }
  }

  redirect("/dashboard");
}
