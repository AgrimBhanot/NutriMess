"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Info } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sent">("idle");

  const queryMessage = searchParams.get("message");
  const queryError = searchParams.get("error");
  const queryReason = searchParams.get("reason");

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (signInError) {
      console.error("Login failed:", signInError.code, signInError.message);
      if (signInError.code === "email_not_confirmed") {
        setNeedsConfirmation(true);
        setError(
          "Your email has not been confirmed yet. Open the link we sent to your inbox, or resend it below."
        );
      } else if (signInError.code === "invalid_credentials") {
        setError("Invalid email or password. Please check your credentials or create an account.");
      } else if (signInError.status === 429) {
        setError("Too many attempts. Please wait a minute and try again.");
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    // "/" routes students to /dashboard and secretaries to their portal
    router.push(data.session ? "/" : "/login");
    router.refresh();
  }

  async function handleResendConfirmation() {
    setLoading(true);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (resendError) {
      setError(
        resendError.status === 429
          ? "Email limit reached. Please wait a while before requesting another link."
          : resendError.message
      );
      return;
    }
    setResendState("sent");
    setError(null);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: "iitr.ac.in", // Restrict to IITR domain
        },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Banner for query messages */}
      {queryMessage === "check_email" && (
        <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800 border border-emerald-200">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
          <span>Registration successful! Please check your email to confirm your account before signing in.</span>
        </div>
      )}
      {queryError && (
        <div className="rounded-xl bg-red-50 p-3.5 text-sm text-red-600 border border-red-200">
          {queryError === "link_expired"
            ? "That link is invalid or has already been used. If you confirmed your email, just sign in below."
            : queryError === "oauth"
              ? `Google sign-in failed: ${queryReason ?? "unknown error"}. Please try again or use email.`
              : "Authentication failed. Please try again."}
        </div>
      )}
      {resendState === "sent" && (
        <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800 border border-emerald-200">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
          <span>Confirmation email sent. Check your inbox (and spam folder).</span>
        </div>
      )}
      {/* Brand */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#244E3D]">
          <span className="text-2xl font-semibold text-white">N</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#111827]">
            Welcome to NutriMess
          </h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            IIT Roorkee Mess Nutrition Tracker
          </p>
        </div>
      </div>

      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 gap-3 rounded-xl border-[#E5E7EB] text-[#111827] font-medium hover:bg-[#F3F4F6]"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with IITR Google Account
      </Button>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-[#9CA3AF]">
          or sign in with email
        </span>
      </div>

      {/* Email/Password form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-[#4B5563]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@iitr.ac.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 rounded-xl border-[#E5E7EB] bg-white placeholder:text-[#D1D5DB]"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-sm font-medium text-[#4B5563]"
          >
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 rounded-xl border-[#E5E7EB] bg-white placeholder:text-[#D1D5DB]"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {needsConfirmation && resendState === "idle" && (
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={loading}
            className="w-full text-sm font-medium text-[#244E3D] hover:underline disabled:opacity-50"
          >
            Resend confirmation email
          </button>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-[#244E3D] font-medium text-white hover:bg-[#1a3a2d]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-[#9CA3AF]">
        New to NutriMess?{" "}
        <Link
          href="/register"
          className="font-medium text-[#244E3D] hover:underline"
        >
          Create an account
        </Link>
      </p>

      {/* Secretary link */}
      <p className="text-center text-xs text-[#D1D5DB]">
        <Link
          href="/register?role=secretary"
          className="hover:text-[#9CA3AF]"
        >
          Mess Secretary? Register here
        </Link>
      </p>
    </div>
  );
}
