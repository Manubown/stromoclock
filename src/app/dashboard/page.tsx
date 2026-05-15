import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { fetchDayAheadPrices, findWindow, providerFor } from "@/lib/prices";
import { isZone, type Zone } from "@/lib/entsoe/zones";
import { ZonePicker } from "@/components/ZonePicker";
import { PriceChart } from "@/components/PriceChart";
import { DigestToggle } from "@/components/DigestToggle";
import { updateZone, setDigestEnabled } from "./actions";

export const dynamic = "force-dynamic";

const WINDOW_HOURS = 3;

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");

  const zone: Zone | null = user.zone && isZone(user.zone) ? user.zone : null;

  let prices: Awaited<ReturnType<typeof fetchDayAheadPrices>> | null = null;
  let fetchError: string | null = null;

  if (zone) {
    try {
      prices = await fetchDayAheadPrices(zone);
    } catch (err) {
      fetchError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  const cheapWindow = prices && prices.length >= WINDOW_HOURS ? findWindow(prices, WINDOW_HOURS, "cheapest") : null;
  const expensiveWindow = prices && prices.length >= WINDOW_HOURS ? findWindow(prices, WINDOW_HOURS, "most-expensive") : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-1 sm:mb-8 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-xl font-semibold sm:text-2xl">Dashboard</h1>
        <span className="break-all text-sm text-muted">{user.email}</span>
      </header>

      <section className="mb-6 sm:mb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted sm:text-sm">
          Bidding zone
        </h2>
        <ZonePicker action={updateZone} current={zone} />
      </section>

      <section className="mb-6 sm:mb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted sm:text-sm">
          Daily digest
        </h2>
        <DigestToggle action={setDigestEnabled} enabled={user.digestEnabled} disabled={!zone} />
      </section>

      {!zone && (
        <p className="rounded-md border border-line bg-panel p-4 text-sm text-muted">
          Pick a zone above to see today&apos;s day-ahead prices.
        </p>
      )}

      {zone && fetchError && (
        <p className="rounded-md border border-danger/40 bg-panel p-4 text-sm text-danger">
          Couldn&apos;t fetch prices: {fetchError}
        </p>
      )}

      {zone && prices && prices.length > 0 && (
        <section>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Stat label="Zone" value={zone} />
            <Stat label="Source" value={providerFor(zone)} />
            {cheapWindow && (
              <Stat
                label={`Cheap ${WINDOW_HOURS}h window`}
                value={`${hourLabel(cheapWindow.start)}–${hourLabel(cheapWindow.end)}`}
                sub={`avg ${eurPerKwh(cheapWindow.avgEurPerMWh)} €/kWh`}
                tone="accent"
              />
            )}
            {expensiveWindow && (
              <Stat
                label={`Expensive ${WINDOW_HOURS}h window`}
                value={`${hourLabel(expensiveWindow.start)}–${hourLabel(expensiveWindow.end)}`}
                sub={`avg ${eurPerKwh(expensiveWindow.avgEurPerMWh)} €/kWh`}
                tone="warn"
              />
            )}
          </div>
          <PriceChart
            prices={prices}
            cheapRange={cheapWindow ? [cheapWindow.startIndex, cheapWindow.endIndex] : null}
            expensiveRange={expensiveWindow ? [expensiveWindow.startIndex, expensiveWindow.endIndex] : null}
          />
        </section>
      )}

      {zone && prices && prices.length === 0 && (
        <p className="rounded-md border border-line bg-panel p-4 text-sm text-muted">
          No prices published yet for this zone. Day-ahead prices typically appear after 13:00 CET.
        </p>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "accent" | "warn";
}) {
  const toneClass = tone === "accent" ? "text-accent" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted sm:text-xs">{label}</div>
      <div className={`mt-1 font-mono text-sm leading-tight sm:text-base ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function eurPerKwh(eurPerMWh: number): string {
  return (eurPerMWh / 1000).toFixed(3);
}
