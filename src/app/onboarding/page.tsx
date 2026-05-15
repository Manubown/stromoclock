import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { BIDDING_ZONES, ZONE_KEYS } from "@/lib/entsoe/zones";
import { completeOnboarding } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  // If the user already finished onboarding, send them straight to the dashboard.
  if (user.zone) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Welcome</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Let&apos;s set up StromOclock
        </h1>
        <p className="mt-2 text-sm text-muted">
          Two quick questions and you&apos;re done.
        </p>
      </header>

      <form action={completeOnboarding} className="flex flex-col gap-8">
        <section>
          <label htmlFor="zone" className="mb-2 block text-sm font-medium">
            1. Where do you live?
          </label>
          <p className="mb-3 text-sm text-muted">
            We use this to fetch the right day-ahead electricity prices.
          </p>
          <select
            id="zone"
            name="zone"
            required
            defaultValue=""
            className="w-full rounded-md border border-line bg-panel px-3 py-3 text-base text-ink focus:border-accent focus:outline-none"
          >
            <option value="" disabled>
              Select your bidding zone…
            </option>
            {ZONE_KEYS.map((z) => (
              <option key={z} value={z}>
                {BIDDING_ZONES[z].label}
              </option>
            ))}
          </select>
        </section>

        <section>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="digest"
              defaultChecked
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border border-line bg-panel accent-accent"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                2. Email me the daily digest
              </span>
              <span className="mt-1 block text-sm text-muted">
                One email per day at 14:00 CET with tomorrow&apos;s cheapest and most-expensive
                hour. You can turn this off any time on your dashboard.
              </span>
            </span>
          </label>
        </section>

        <button
          type="submit"
          className="mt-2 w-full rounded-md bg-accent px-4 py-3 text-base font-medium text-bg hover:opacity-90 active:opacity-80"
        >
          Continue to dashboard
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-muted">
        Signed in as {user.email}
      </p>
    </main>
  );
}
