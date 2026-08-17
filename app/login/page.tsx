"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);

    // Login is routed through a custom API route (VULN 2) so the auth endpoint
    // is hit server-side with the service-role key — no app-level rate limiting.
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // VULN 4: "Remember me" stores the raw access token in localStorage
    // (readable via localStorage.getItem("foodrush_access_token") or XSS)
    // instead of an httpOnly cookie.
    if (data.session?.access_token) {
      if (remember) {
        localStorage.setItem("foodrush_access_token", data.session.access_token);
      }
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    // Keep the real auth user id alongside the profile (the profile id is a
    // fixed seed value for demo users, so the auth id is the accurate one).
    if (data.user?.id) {
      localStorage.setItem("foodrush_auth_id", data.user.id);
    }

    // Profile (incl. role) is trusted from the client — stored in localStorage.
    const profile =
      data.profile ??
      (
        await supabase
          .from("users")
          .select("*")
          .eq("email", email.trim().toLowerCase())
          .single()
      ).data;

    if (profile) {
      localStorage.setItem("foodrush_user", JSON.stringify(profile));
    }

    // Notify open pages (menu/cart headers) that the signed-in user changed,
    // so they switch to this user's saved cart.
    window.dispatchEvent(new Event("foodrush:auth-changed"));

    const role = profile?.role as string | undefined;
    const requested = searchParams.get("next");
    const next =
      requested ??
      (role === "admin" ? "/admin" : role === "restaurant_owner" ? "/owner" : "/menu");
    router.replace(next);
    router.refresh();
  }

  async function handleForgot() {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter your email address first, then click Forgot password.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) {
      setError(error.message);
      return;
    }
    setInfo("If that account exists, a password reset link is on its way.");
  }



  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        <>
          Sign in to pick up where you left off — your cravings are waiting.
        </>
      }
      footer={
        <>
          New to CraveKart?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary-600 transition-colors hover:text-primary-700"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="animate-fade-in rounded-xl border border-coral-500/25 bg-coral-500/10 px-4 py-3 text-sm font-medium text-coral-500">
            {error}
          </div>
        )}

        {info && (
          <div className="animate-fade-in rounded-xl border border-sage-500/25 bg-sage-500/10 px-4 py-3 text-sm font-medium text-sage-600">
            {info}
          </div>
        )}

        <Field label="Email address" htmlFor="email">
          <Input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            icon={<Mail className="size-[18px]" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer select-none items-center gap-2 text-ink-500">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 cursor-pointer accent-primary-600"
            />
            Keep me signed in
          </label>
          <button
            type="button"
            onClick={handleForgot}
            className="font-semibold text-primary-600 transition-colors hover:text-primary-700"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
