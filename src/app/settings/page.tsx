import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isZone, type Zone } from "@/lib/entsoe/zones";
import { ZonePicker } from "@/components/ZonePicker";
import { DigestToggle } from "@/components/DigestToggle";
import { setDigestEnabled, updateZone } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");

  const zone: Zone | null = user.zone && isZone(user.zone) ? user.zone : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between sm:mb-8">
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
          ← Dashboard
        </Link>
        <span className="break-all text-sm text-muted">{user.email}</span>
      </header>

      <h1 className="mb-6 text-xl font-semibold sm:mb-8 sm:text-2xl">Settings</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted sm:text-sm">
          Bidding zone
        </h2>
        <p className="mb-3 text-sm text-muted">
          Day-ahead prices are fetched for this zone. Change it any time.
        </p>
        <ZonePicker action={updateZone} current={zone} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted sm:text-sm">
          Daily digest
        </h2>
        <DigestToggle action={setDigestEnabled} enabled={user.digestEnabled} disabled={!zone} />
      </section>
    </main>
  );
}
