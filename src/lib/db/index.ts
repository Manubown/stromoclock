import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let cached: DbClient | null = null;

function getDb(): DbClient {
  if (cached) return cached;
  const sql = neon(env.DATABASE_URL);
  cached = drizzle(sql, { schema });
  return cached;
}

/**
 * Lazily-initialized Drizzle client. Defers env access until first query,
 * so `next build` can collect page data without DATABASE_URL set.
 */
export const db = new Proxy({} as DbClient, {
  get(_target, prop: string | symbol) {
    const client = getDb() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
}) as DbClient;
