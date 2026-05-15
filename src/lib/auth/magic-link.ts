import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { magicLinkTokens, users, type User } from "@/lib/db/schema";

const TOKEN_TTL_MIN = 15;

export async function issueToken(email: string): Promise<string> {
  const token = nanoid(40);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);
  await db.insert(magicLinkTokens).values({
    token,
    email: email.toLowerCase(),
    expiresAt,
  });
  return token;
}

/**
 * Consume a magic-link token. Returns the user on success.
 * Idempotent failure: returns null if token is missing, expired, or already consumed.
 * Also creates the user row if this is their first sign-in.
 */
export async function consumeToken(token: string): Promise<User | null> {
  const [row] = await db
    .select()
    .from(magicLinkTokens)
    .where(and(eq(magicLinkTokens.token, token), isNull(magicLinkTokens.consumedAt)))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  await db
    .update(magicLinkTokens)
    .set({ consumedAt: new Date() })
    .where(eq(magicLinkTokens.token, token));

  const existing = await db.select().from(users).where(eq(users.email, row.email)).limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db.insert(users).values({ email: row.email }).returning();
  return created;
}
