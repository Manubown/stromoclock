import { Resend } from "resend";
import { env } from "@/lib/env";

let cached: Resend | null = null;

function client(): Resend {
  if (!cached) cached = new Resend(env.RESEND_API_KEY);
  return cached;
}

export async function sendMagicLink(email: string, token: string): Promise<void> {
  const link = `${env.APP_URL}/verify?token=${encodeURIComponent(token)}`;

  const { error } = await client().emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Sign in to StromOclock",
    text:
      `Click this link to sign in:\n\n${link}\n\n` +
      `The link expires in 15 minutes. If you didn't request it, ignore this email.`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#14181d">
        <h2 style="margin:0 0 12px">Sign in to StromOclock</h2>
        <p style="margin:0 0 16px">Click the button below to sign in. The link expires in 15 minutes.</p>
        <p style="margin:0 0 24px">
          <a href="${link}" style="display:inline-block;background:#0b0d10;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Sign in</a>
        </p>
        <p style="font-size:12px;color:#666;margin:0">If the button doesn't work, paste this URL into your browser:<br/><span style="word-break:break-all">${link}</span></p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
