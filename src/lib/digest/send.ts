import { Resend } from "resend";
import { env } from "@/lib/env";
import type { HourlyPrice } from "@/lib/entsoe/parse";
import type { Zone } from "@/lib/entsoe/zones";
import type { Provider } from "@/lib/prices";

let cached: Resend | null = null;
function client(): Resend {
  if (!cached) cached = new Resend(env.RESEND_API_KEY);
  return cached;
}

function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function eurPerKwh(eurPerMWh: number): string {
  return (eurPerMWh / 1000).toFixed(3);
}

export type DigestKind = "digest" | "welcome";

export type DigestPayload = {
  zone: Zone;
  provider: Provider;
  prices: HourlyPrice[];
  kind?: DigestKind; // default "digest"
};

export async function sendDigestEmail(email: string, payload: DigestPayload): Promise<void> {
  const { zone, provider, prices } = payload;
  const kind = payload.kind ?? "digest";
  if (prices.length === 0) throw new Error("digest payload has no prices");

  const cheapest = prices.reduce((a, b) => (a.eurPerMWh <= b.eurPerMWh ? a : b));
  const priciest = prices.reduce((a, b) => (a.eurPerMWh >= b.eurPerMWh ? a : b));

  const dateLabel = new Date(prices[0].start).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Berlin",
  });

  const subject =
    kind === "welcome"
      ? `Welcome to StromOclock — cheapest hour today is ${hourLabel(cheapest.start)} at €${eurPerKwh(cheapest.eurPerMWh)}/kWh`
      : `Cheapest hour ${dateLabel}: ${hourLabel(cheapest.start)} at €${eurPerKwh(cheapest.eurPerMWh)}/kWh`;

  const intro =
    kind === "welcome"
      ? `Welcome to StromOclock! You're set up for zone ${zone} (source: ${provider}). Here are the next 24h of electricity prices — you'll get one of these every day at 14:00 CET.\n\n`
      : `StromOclock — day-ahead prices for ${dateLabel} (${zone}, source: ${provider})\n\n`;

  const text =
    intro +
    `Cheapest hour: ${hourLabel(cheapest.start)} — €${eurPerKwh(cheapest.eurPerMWh)}/kWh\n` +
    `Most expensive: ${hourLabel(priciest.start)} — €${eurPerKwh(priciest.eurPerMWh)}/kWh\n\n` +
    `Full breakdown at ${env.APP_URL}/dashboard\n\n` +
    `To stop receiving these, sign in and toggle off the daily digest.`;

  const html = renderHtml({ kind, dateLabel, zone, provider, cheapest, priciest });

  const { error } = await client().emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject,
    text,
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

function renderHtml(args: {
  kind: DigestKind;
  dateLabel: string;
  zone: Zone;
  provider: Provider;
  cheapest: HourlyPrice;
  priciest: HourlyPrice;
}): string {
  const { kind, dateLabel, zone, provider, cheapest, priciest } = args;
  const dashboardUrl = `${env.APP_URL}/dashboard`;
  const headline =
    kind === "welcome" ? "Welcome to StromOclock" : `Day-ahead prices for ${dateLabel}`;
  const subhead =
    kind === "welcome"
      ? `You're set up for zone ${zone} · source: ${provider}. The next 24h of prices are below; from tomorrow, you'll get this digest every day at 14:00 CET.`
      : `Zone ${zone} · source: ${provider}`;

  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#14181d;max-width:520px">
      <h2 style="margin:0 0 4px">${headline}</h2>
      <p style="margin:0 0 20px;color:#666;font-size:13px">${subhead}</p>
      <div style="border:1px solid #e6eaef;border-radius:8px;padding:16px;margin-bottom:12px;background:#f3fdf5">
        <div style="font-size:12px;color:#1a7f37;text-transform:uppercase;letter-spacing:.04em">Cheapest hour</div>
        <div style="font-size:18px;font-weight:600;margin-top:4px">${hourLabel(cheapest.start)} — €${eurPerKwh(cheapest.eurPerMWh)}/kWh</div>
      </div>
      <div style="border:1px solid #e6eaef;border-radius:8px;padding:16px;margin-bottom:24px;background:#fff6f0">
        <div style="font-size:12px;color:#b3590a;text-transform:uppercase;letter-spacing:.04em">Most expensive</div>
        <div style="font-size:18px;font-weight:600;margin-top:4px">${hourLabel(priciest.start)} — €${eurPerKwh(priciest.eurPerMWh)}/kWh</div>
      </div>
      <p style="margin:0 0 24px">
        <a href="${dashboardUrl}" style="display:inline-block;background:#0b0d10;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open full breakdown</a>
      </p>
      <p style="font-size:12px;color:#666;margin:0">To stop receiving these, sign in and toggle off the daily digest on your dashboard.</p>
    </div>
  `;
}
