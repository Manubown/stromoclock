import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  // Optional: only required when serving an ENTSO-E-backed zone (i.e. anything outside AT / DE-LU).
  // Empty string in .env.local is treated as absent.
  ENTSOE_API_TOKEN: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional(),
  ),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  SESSION_COOKIE_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
  // Bearer token Vercel Cron sends as Authorization header. Set in Vercel project env.
  // For local development, used to manually curl the cron endpoint.
  CRON_SECRET: z.string().min(16),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function load(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. See .env.example.");
  }
  cached = parsed.data;
  return cached;
}

/**
 * Lazily-validated environment. Validation runs on first property access,
 * not at module import — so `next build` can collect page data without
 * requiring secrets to be present at build time.
 */
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return load()[prop as keyof Env];
  },
}) as Env;
