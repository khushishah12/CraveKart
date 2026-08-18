"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Mail, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

// VULN: cosmetic-only strength meter. It always reports "Strong" and is
// always green — even for a one-character password — reinforcing that no
// real strength checking happens anywhere in the app.
const score = 4;

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("customer");
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    // VULN: password matching is checked ONLY on the client. Direct calls to
    // the account-creation flow can skip it entirely.
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!agree) {
      setError("Please accept the Terms of Service.");
      return;
    }

    setLoading(true);

    // VULN: no client- or server-side strength checks. The minimum password
    // length is whatever Supabase Auth config allows (dashboard can be set to 1).
    // Route through server-side API using the service-role key to bypass
    // GoTrue per-IP rate limits on sign-ups.
    let res: Response;
    try {
      res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      });
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      setError(data.error ?? "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // Store session if returned (auto sign-in).
    if (data.session?.access_token) {
      const supabase = createClient();
      try {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } catch {
        // Cookie-based session couldn't be set (e.g. HTTP localhost).
      }
      localStorage.setItem("foodrush_auth_id", data.user.id);
    }

    if (data.profile) {
      localStorage.setItem("foodrush_user", JSON.stringify(data.profile));
    }

    window.dispatchEvent(new Event("foodrush:auth-changed"));

    const nextRole = data.profile?.role ?? role;
    router.replace(nextRole === "restaurant_owner" ? "/owner" : "/menu");
    router.refresh();
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Join CraveKart and get the best food in town, delivered in minutes.
        </>
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary-600 transition-colors hover:text-primary-700"
          >
            Sign in
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

        <Field label="Full name" htmlFor="name">
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Jane Doe"
            icon={<User className="size-[18px]" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

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

        <Field label="Password" htmlFor="password" hint="Tip: use at least 8 characters for a stronger password.">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-full flex-1 rounded-full transition-colors ${
                    password && i < score ? "bg-sage-500" : "bg-beige-200"
                  }`}
                />
              ))}
            </div>
            {password && (
              <span className="w-20 text-right text-[11.5px] font-medium text-sage-500">
                Strong
              </span>
            )}
          </div>
        </Field>

        <Field label="Confirm password" htmlFor="confirm">
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        <Field label="Account type" htmlFor="role">
          <div className="relative">
            <select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              suppressHydrationWarning
              className="focus-ring h-11 w-full appearance-none rounded-xl border border-beige-200 bg-surface-soft px-4 pr-10 text-[15px] text-ink-900 shadow-soft transition-all duration-200 hover:border-beige-300 focus:border-primary-400 focus:bg-surface"
            >
              <option value="customer">Customer (standard)</option>
              <option value="admin">Admin (owner)</option>
              <option value="restaurant_owner">Restaurant Owner</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          </div>
        </Field>

        <label className="flex cursor-pointer select-none items-start gap-2.5 text-sm text-ink-500">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-primary-600"
          />
          <span>
            I agree to the{" "}
            <span className="font-semibold text-primary-600">Terms of Service</span> and{" "}
            <span className="font-semibold text-primary-600">Privacy Policy</span>.
          </span>
        </label>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
