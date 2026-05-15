"use client";

import { useTransition } from "react";
import { BIDDING_ZONES, ZONE_KEYS, type Zone } from "@/lib/entsoe/zones";

export function ZonePicker({
  action,
  current,
}: {
  action: (formData: FormData) => Promise<void>;
  current: Zone | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <select
        name="zone"
        defaultValue={current ?? ""}
        className="min-w-0 flex-1 rounded-md border border-line bg-panel px-3 py-2.5 text-base text-ink focus:border-accent focus:outline-none sm:text-sm"
        required
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
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 rounded-md border border-line bg-panel px-4 py-2.5 text-base text-ink hover:border-accent disabled:opacity-50 sm:text-sm"
      >
        {isPending ? "Saving…" : "Save zone"}
      </button>
    </form>
  );
}
