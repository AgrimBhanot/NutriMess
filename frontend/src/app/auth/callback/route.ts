import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Relative redirect. Behind Azure Static Web Apps, request.url carries the
 * internal container host (e.g. https://d38c74da8e20:8080), so absolute
 * redirects built from it send users to an unreachable address. A relative
 * Location resolves against the public URL the browser is actually on.
 * Session cookies set via cookies() are still attached to this response.
 */
function redirectTo(path: string): Response {
  return new Response(null, { status: 307, headers: { Location: path } });
}

// Handles both OAuth / PKCE email links (`?code=`) and token-hash email
// links (`?token_hash=&type=`), which work even when the link is opened in a
// different browser than the one used to sign up.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Only allow same-site relative redirects
  const nextParam = searchParams.get("next") ?? "/";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  // OAuth failures come back as ?error=...&error_description=... (no code).
  // Surface the real reason instead of a generic "link expired".
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    console.error("OAuth sign-in failed:", oauthError);
    const params = new URLSearchParams({ error: "oauth", reason: oauthError });
    return redirectTo(`/login?${params}`);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectTo(next);
    console.error("Code exchange failed:", error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return redirectTo(next);
    console.error("OTP verification failed:", error.message);
  }

  // Email links can be consumed by link scanners/prefetch; the account may
  // already be confirmed, so point the user at sign-in rather than a dead end.
  return redirectTo("/login?error=link_expired");
}
