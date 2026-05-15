import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">StromOclock</h1>
      <p className="mt-4 text-base text-muted sm:text-lg">
        Run your dishwasher at 14:00 today — that&apos;s the cheapest hour. Daily notifications for EU
        households on dynamic electricity tariffs.
      </p>
      <div className="mt-8">
        <Link
          href="/signin"
          className="inline-block w-full rounded-md bg-accent px-5 py-3 text-center font-medium text-bg hover:opacity-90 sm:w-auto"
        >
          Sign in with email
        </Link>
      </div>
      <p className="mt-12 text-xs text-muted sm:text-sm">
        Supports AT, DE-LU, NL, IE, DK, SE, NO, FI. Spot prices from aWATTar and ENTSO-E.
      </p>
    </main>
  );
}
