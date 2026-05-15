# StromOclock

> "Run your dishwasher at 14:00 today — that's the cheapest hour." A push/email notifier for EU households on dynamic electricity tariffs.

See `INIT.md` for the v1 product brief.

## Status

**v1 in progress.** Done: magic-link auth, zone picker, 24h price chart, daily-digest email (Vercel Cron). Remaining for v1: appliance scheduling, web push, DE i18n, end-customer pricing.

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind 3
- Neon Postgres + Drizzle ORM
- Resend (magic-link email)
- Day-ahead prices:
  - **aWATTar** (free, no auth) for AT and DE-LU
  - **ENTSO-E** Transparency Platform (optional token) for NL, IE, DK, SE, NO, FI
- Recharts

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Provision external accounts

- **Neon** — create a free Postgres at https://neon.tech, copy the pooled connection string.
- **Resend** — sign up at https://resend.com. For local dev you can send from `onboarding@resend.dev` without a verified domain.
- **ENTSO-E token** _(optional, only for NL/IE/DK/SE/NO/FI users)_ — register at https://transparency.entsoe.eu, then email `transparency@entsoe.eu` from your registered address requesting "Restful API" access (free, usually 1 working day). AT and DE-LU use the free no-auth aWATTar API.

### 3. Configure environment

```bash
cp .env.example .env.local
# fill in DATABASE_URL, ENTSOE_API_TOKEN, RESEND_API_KEY, SESSION_COOKIE_SECRET
```

Generate a session secret:

```bash
openssl rand -base64 48
```

### 4. Create the database schema

```bash
pnpm db:push
```

### 5. Run

```bash
pnpm dev
```

Open http://localhost:3000.

## Daily digest (Vercel Cron)

A user who picks a zone and opts in via the dashboard toggle gets one email each day at ~14:00 CET (13:00 UTC) summarising tomorrow's cheapest and most expensive hour.

- Cron is declared in `vercel.json` (`/api/cron/daily-digest`, schedule `0 13 * * *` UTC).
- The endpoint requires `Authorization: Bearer $CRON_SECRET`. Vercel Cron sends this automatically when `CRON_SECRET` is set as a Vercel env var.
- Idempotency: each `(user_id, send_date)` is locked via the `digest_sends` table, so re-runs don't double-send.

Test it locally:

```bash
# Generate a secret for .env.local
openssl rand -base64 32

# Then curl the endpoint
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-digest
```

You'll get a JSON report: `{ sendDate, attempted, sent, skipped, errors }`.

## Deploy to Vercel

### 1. Push to a git remote

Vercel deploys from a git provider (GitHub, GitLab, Bitbucket). Initialize the repo and push:

```bash
git init
git add .
git commit -m "Initial StromOclock walking skeleton"
git remote add origin git@github.com:<you>/stromoclock.git
git push -u origin main
```

### 2. Import the project on Vercel

- Go to https://vercel.com/new, select your repo.
- Framework preset: **Next.js** (auto-detected).
- Build command: `pnpm build` (auto).
- Install command: `pnpm install` (auto).
- Root directory: project root.

### 3. Set environment variables

In **Project Settings → Environment Variables**, add the following for **Production** (and optionally Preview):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string with `?sslmode=require` |
| `RESEND_API_KEY` | `re_…` |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.example` (must be on a verified Resend domain — see below) |
| `SESSION_COOKIE_SECRET` | `openssl rand -base64 48` |
| `APP_URL` | `https://<your-vercel-domain>` (or your custom domain, no trailing slash) |
| `CRON_SECRET` | `openssl rand -base64 32` |
| `ENTSOE_API_TOKEN` | _(optional — only needed if you serve NL/IE/DK/SE/NO/FI users)_ |

> **Resend domain note.** `onboarding@resend.dev` works for local dev but is **rate-limited and only sends to your own Resend account email** — it cannot send to real users in production. Before going live, add and verify your sending domain at https://resend.com/domains, then set `RESEND_FROM_EMAIL` to an address on that domain.

### 4. Region (recommended)

For lowest latency to Neon's EU regions, set **Project Settings → Functions → Region** to `Frankfurt (fra1)`. EU users hitting EU-hosted Postgres from EU-hosted serverless = ~5ms instead of ~150ms.

### 5. First deploy + database schema

1. Trigger the first deploy from Vercel (it'll fail health checks until the DB schema exists — that's expected on the very first push).
2. From your local machine, with the production `DATABASE_URL` in `.env.local`, run:
   ```bash
   pnpm db:push
   ```
   This creates `users`, `magic_link_tokens`, `sessions`, `price_cache`, and `digest_sends` in your production Neon DB.
3. Redeploy from Vercel (Deployments → ⋯ → Redeploy) — the app should be live.

### 6. Verify the cron

- **Project Settings → Cron Jobs** should list `/api/cron/daily-digest` running at `0 13 * * *` (UTC). This is picked up automatically from `vercel.json`.
- Manually trigger it once from the Vercel UI (Cron Jobs → ⋯ → Run Now) to confirm it succeeds. Check **Logs** for the `[cron] daily-digest` line with the result counts.
- The daily run fires at 13:00 UTC = **14:00 CET** (winter) / **15:00 CEST** (summer). The 1-hour summer drift is acceptable: day-ahead data is published by ~13:00 CET / 12:00 UTC, well before our run.

### 7. Custom domain (optional)

- Add a domain in **Project Settings → Domains**.
- Update `APP_URL` to the new https URL (magic-link emails use this).
- If you also moved Resend sending to a subdomain of this same domain, the SPF/DKIM records share configuration nicely.

### Production checklist

- [ ] All seven env vars set in Vercel
- [ ] Resend domain verified (no longer using `onboarding@resend.dev`)
- [ ] `RESEND_FROM_EMAIL` points to verified domain
- [ ] Region set to `fra1`
- [ ] `pnpm db:push` run against production DB
- [ ] Cron Jobs entry visible in Vercel
- [ ] Manual cron trigger succeeds and an email arrives
- [ ] Sign in works end-to-end on the live domain

## Manual verification

1. Visit `/` → click "Sign in with email".
2. Submit your email → "Check your inbox" screen.
3. Click the magic link in the email → land on `/dashboard`.
4. Pick a bidding zone (e.g. DE-LU) → save → chart renders with 24h of prices.
5. Reload `/dashboard` → second load reads from `price_cache` (no ENTSO-E hit).
6. Open `/dashboard` in a private window → redirected to `/signin`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run the dev server on :3000 |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint via `next lint` |
| `pnpm db:generate` | Generate a new Drizzle migration from `schema.ts` |
| `pnpm db:push` | Apply schema directly to the DB (dev only) |
| `pnpm db:studio` | Open Drizzle Studio |

## Project layout

```
src/
├── app/                       # Next.js App Router
│   ├── (auth)/                # signin page + verify route
│   ├── api/
│   │   ├── prices/            # GET /api/prices?zone=…
│   │   └── cron/daily-digest/ # bearer-auth cron handler
│   ├── dashboard/             # auth-guarded main UX
│   ├── layout.tsx
│   ├── page.tsx               # landing
│   └── globals.css
├── components/                # ZonePicker, PriceChart, DigestToggle
├── lib/
│   ├── auth/                  # session, magic-link, email
│   ├── awattar/               # aWATTar JSON adapter (AT, DE-LU)
│   ├── db/                    # Drizzle schema + client
│   ├── digest/                # send + run orchestrator
│   ├── entsoe/                # zones, XML parser, ENTSO-E adapter
│   ├── prices.ts              # resolver: routes zone → provider, caches results
│   └── env.ts                 # Zod-validated process.env
├── middleware.ts              # /dashboard auth guard
vercel.json                    # cron schedule
```

## What's intentionally out of scope (still)

- Web Push (VAPID, service worker)
- Per-appliance scheduling
- Tibber / aWATTar end-customer pricing (true cost beyond spot)
- DE/EN i18n
- Automated tests beyond manual verification
- GDPR consent UI

These are tracked for later slices.
