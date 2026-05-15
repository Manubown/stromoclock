import { redirect } from "next/navigation";
import { z } from "zod";
import { issueToken } from "@/lib/auth/magic-link";
import { sendMagicLink } from "@/lib/auth/email";

const emailSchema = z.string().email().max(254);

async function sendLink(formData: FormData) {
  "use server";
  const raw = formData.get("email");
  if (typeof raw === "string") {
    const parsed = emailSchema.safeParse(raw.trim());
    if (parsed.success) {
      const email = parsed.data.toLowerCase();
      const token = await issueToken(email);
      await sendMagicLink(email, token);
    }
  }
  // Always redirect to the "sent" screen — don't leak whether the email exists.
  redirect("/signin?sent=1");
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  if (sent) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold">Check your inbox</h1>
        <p className="mt-3 text-muted">
          If that email is valid, we sent you a sign-in link. It expires in 15 minutes.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Sign in to StromOclock</h1>
      <p className="mt-2 text-sm text-muted sm:text-base">
        We&apos;ll email you a magic link — no password.
      </p>
      {error && (
        <p className="mt-3 rounded-md border border-danger/40 bg-panel p-3 text-sm text-danger">
          {error === "invalid_token"
            ? "That link is invalid or expired. Request a new one below."
            : "Something went wrong. Try again."}
        </p>
      )}
      <form action={sendLink} className="mt-6 flex flex-col gap-3">
        <label htmlFor="email" className="text-sm text-muted">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="rounded-md border border-line bg-panel px-3 py-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="mt-2 rounded-md bg-accent px-4 py-3 text-base font-medium text-bg hover:opacity-90"
        >
          Send link
        </button>
      </form>
    </main>
  );
}
