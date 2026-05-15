"use client";

import { useTransition } from "react";

export function DigestToggle({
  action,
  enabled,
  disabled,
}: {
  action: (formData: FormData) => Promise<void>;
  enabled: boolean;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
      className="flex w-full items-start gap-3"
    >
      <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
      <button
        type="submit"
        disabled={disabled || isPending}
        aria-pressed={enabled}
        className={`relative mt-0.5 box-content inline-block h-6 w-11 shrink-0 rounded-full border border-line transition-colors disabled:opacity-50 ${
          enabled ? "bg-accent" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-bg shadow-sm transition-[left] duration-150 ${
            enabled ? "left-[22px]" : "left-[2px]"
          }`}
        />
      </button>
      <span className="min-w-0 flex-1 text-sm text-muted">
        {disabled
          ? "Pick a zone first to enable the digest."
          : isPending
            ? "Saving…"
            : enabled
              ? "On — you'll get tomorrow's prices every day at 14:00 CET."
              : "Off — opt in to receive a daily price summary."}
      </span>
    </form>
  );
}
