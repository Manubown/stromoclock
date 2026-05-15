"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { isZone } from "@/lib/entsoe/zones";

export async function updateZone(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("unauthorized");

  const zone = formData.get("zone");
  if (typeof zone !== "string" || !isZone(zone)) {
    throw new Error("invalid_zone");
  }

  await db.update(users).set({ zone }).where(eq(users.id, user.id));
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function setDigestEnabled(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("unauthorized");

  const enabled = formData.get("enabled") === "1";
  await db.update(users).set({ digestEnabled: enabled }).where(eq(users.id, user.id));
  revalidatePath("/settings");
}
