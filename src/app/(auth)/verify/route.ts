import { NextResponse, type NextRequest } from "next/server";
import { consumeToken } from "@/lib/auth/magic-link";
import { createSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/signin?error=missing_token", req.url));
  }

  const user = await consumeToken(token);
  if (!user) {
    return NextResponse.redirect(new URL("/signin?error=invalid_token", req.url));
  }

  await createSession(user.id);
  // New users (no zone yet) get the onboarding wizard; returning users go straight to the dashboard.
  const next = user.zone ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(new URL(next, req.url));
}
