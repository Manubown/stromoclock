# StromOclock

> "Run your dishwasher at 14:00 today — that's the cheapest hour." A push/email notifier for EU households on dynamic electricity tariffs.

## Problem

In Q2-2025, EU household electricity prices peaked at €0.40/kWh in Ireland, €0.39 in Germany, €0.35 in Belgium ([Eurostat](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Electricity_price_statistics)). Within a single day, spot prices on Nord Pool / EPEX can swing 5–10×. Households on dynamic tariffs (aWATTar in AT, Tibber in DE/NL/Nordics, Octopus Agile in IE) save real money by running washing machines, EVs, and heat pumps at the cheap hours — but most users don't actively check. Existing dashboards ([euenergy.live](https://euenergy.live/), [WattSmart](https://wattsmart.app/), Tibber's own app) show the data; almost none **tell you what to do** in plain language at the right moment.

## Target users

1. **EU households on dynamic tariffs** in AT, DE, NL, IE, DK, SE, NO, FI (aWATTar / Tibber / Octopus / Barry / Tibber).
2. **EV owners** scheduling overnight charging.
3. **Heat-pump owners** with flexible setpoints.

## v1 scope

- Pick your bidding zone (AT, DE-LU, NL, IE, DK1/2, SE1–4, NO1–5, FI). Optional: pick your tariff provider for accurate end-customer pricing (aWATTar applies a fixed markup over spot, Tibber too).
- Daily 14:00 CET notification (email + web push): "Tomorrow's cheapest hour is 03:00 at €0.04/kWh. Most expensive: 19:00 at €0.31."
- Per-appliance setup: "Dishwasher (2h runtime, deferrable until 06:00)" → app picks the cheapest 2h window.
- Embedded chart of next 24h hourly prices.
- DE + EN UI v1; FR/NL/ES post-launch.

## Out of scope (v1)

- Smart-plug control / actual automation. We *recommend*; we don't *act*. (v2: Home Assistant + Matter integration.)
- Solar/PV optimization (sell-back, forecasting). Different problem shape.
- Gas, district heating, fuel prices.

## Data sources

- **ENTSO-E Transparency Platform** — day-ahead prices, free, EU-wide. https://transparency.entsoe.eu/ (REST API, requires free token)
- **aWATTar API** (AT/DE end-customer pricing including grid fees + tax) — public, no auth. https://www.awattar.at/services/api
- **Tibber API** (NO/SE/DK/DE/NL) — OAuth, customer-specific.

## Key risks

- **End-customer price ≠ spot price.** Grid fees, taxes, provider markup vary by country and provider. v1 = spot prices (clear about it); aWATTar integration for AT users adds true end-cost.
- **Cron reliability on Vercel.** Vercel Cron is at-least-once and zone-local; for ~14:00 CET daily fetch + push, this is fine but logging is mandatory.
- **Web Push on iOS** requires PWA install. Email fallback is the safe baseline.
- **GDPR.** Email + zone is minimal but still PII. Need data-processor agreement with whoever sends email (Resend, Postmark — both EU-friendly).

## Tech stack

- **Framework:** Next.js 15 (App Router) + TypeScript + Tailwind
- **DB:** Neon or Vercel Postgres
- **Auth:** Magic link (Resend) — no password, EU-hosted email
- **Cron:** Vercel Cron — daily 14:30 CET fetch ENTSO-E, queue notifications
- **Push:** Web Push API + VAPID; email via Resend EU region
- **Charts:** Recharts or Visx

## Success metric

**Engagement:** % of subscribed users who click through the daily notification (target 25 %+).
**Retention:** 30-day notification-open rate.
**Hard signal:** users who add ≥1 appliance schedule (= "this app works for me").

## Notable references

- [euenergy.live](https://euenergy.live/) — closest existing tool (read-only dashboard, no notifications, no appliance scheduling)
- [Ember EU wholesale data](https://ember-energy.org/data/european-wholesale-electricity-price-data/)
- [aWATTar's own customer app](https://www.awattar.at/) — limited to aWATTar customers
