"use client";

import { useState } from "react";
import { MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";

import { AUTH_EVENT, type UserProfile } from "@/lib/cart";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { AdminNav } from "@/components/ui/AdminNav";
import { useCurrentUser, useIsAdmin } from "@/lib/auth";

function initials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

function EditProfileForm({
  profile,
}: {
  profile: Pick<UserProfile, "name" | "phone" | "delivery_address">;
}) {
  const [form, setForm] = useState({
    name: profile.name ?? "",
    phone: profile.phone ?? "",
    address: profile.delivery_address ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; message: string } | null>(null);

  async function saveProfile() {
    setSaving(true);
    setResult(null);
    try {
      const r = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          delivery_address: form.address,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setResult({ message: d.error ?? "Failed to update profile." });
        return;
      }
      // Keep the local profile snapshot in sync with the server.
      if (d.profile) {
        const existing = JSON.parse(localStorage.getItem("foodrush_user") ?? "null") ?? {};
        localStorage.setItem("foodrush_user", JSON.stringify({ ...existing, ...d.profile }));
        window.dispatchEvent(new Event(AUTH_EVENT));
      }
      setForm((f) => ({
        name: d.profile?.name ?? f.name,
        phone: d.profile?.phone ?? f.phone,
        address: d.profile?.delivery_address ?? f.address,
      }));
      setResult({ ok: true, message: "Profile updated." });
    } catch {
      setResult({ message: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card card-pad mt-5">
      <h2 className="flex items-center gap-2 font-bold text-ink-900">
        <UserRound className="size-5 text-primary-600" />
        Edit profile
      </h2>
      <div className="mt-4 space-y-3">
        <Field label="Full name" htmlFor="edit-name">
          <Input
            id="edit-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Jane Doe"
            icon={<UserRound className="size-[18px]" />}
          />
        </Field>
        <Field label="Phone" htmlFor="edit-phone">
          <Input
            id="edit-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+91 90000 00000"
            icon={<Phone className="size-[18px]" />}
          />
        </Field>
        <Field label="Delivery address" htmlFor="edit-address">
          <Input
            id="edit-address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="221B Baker Street, Apt 4, Mumbai 400001"
            icon={<MapPin className="size-[18px]" />}
          />
        </Field>
      </div>
      <Button className="mt-5 w-full" size="lg" loading={saving} onClick={saveProfile}>
        Save profile
      </Button>
      {result && (
        <p
          className={`mt-3 text-center text-sm font-medium ${result.ok ? "text-sage-500" : "text-coral-500"}`}
          role="status"
        >
          {result.message}
        </p>
      )}
      <p className="mt-3 text-center text-xs text-ink-400">
        Saved via POST /api/profile/update — authenticated by session cookie
        only, no CSRF token and no Origin check (SameSite=None).
      </p>
    </section>
  );
}

export default function ProfilePage() {
  const profile = useCurrentUser();
  const isAdmin = useIsAdmin();

  const [current, setCurrent] = useState("");
  const [email, setEmail] = useState("");
  const [emailResult, setEmailResult] = useState<{ ok?: boolean; message: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  async function changeEmail() {
    setEmailLoading(true);
    setEmailResult(null);
    try {
      const r = await fetch(`/api/profile?current=${encodeURIComponent(current)}&email=${encodeURIComponent(email)}`);
      const d = await r.json();
      setEmailResult(
        r.ok ? { ok: true, message: "Email updated!" } : { message: d.error ?? "Failed." }
      );
    } catch {
      setEmailResult({ message: "Network error." });
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <PageShell
      backHref="/"
      backLabel="Go home"
      maxWidth="max-w-2xl"
      nav={isAdmin ? <AdminNav /> : undefined}
    >
      <PageHeader
        icon={UserRound}
        title="Your profile"
        subtitle="Manage your account details and preferences."
      />

      <section className="card card-pad mt-8">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-xl font-bold text-white shadow-glow">
            {initials(profile?.name ?? profile?.email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-extrabold tracking-tight text-ink-900">
              {profile?.name ?? "Signed out"}
            </p>
            <p className="truncate text-sm text-ink-500">{profile?.email ?? "—"}</p>
          </div>
          <Badge tone={isAdmin ? "brand" : "neutral"} dot>
            {profile?.role ?? "guest"}
          </Badge>
        </div>
        {profile?.id && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-cream px-4 py-2.5">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              User ID
            </span>
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink-700">
              {profile.id}
            </code>
          </div>
        )}
      </section>

      {/* keyed by profile id so the form re-initializes when the signed-in
          user changes (avoids effect-based state syncing) */}
      <EditProfileForm
        key={profile?.id ?? "anon"}
        profile={{
          name: profile?.name ?? null,
          phone: profile?.phone ?? null,
          delivery_address: profile?.delivery_address ?? null,
        }}
      />

      <section className="card card-pad mt-5">
        <h2 className="flex items-center gap-2 font-bold text-ink-900">
          <ShieldCheck className="size-5 text-primary-600" />
          Change email
        </h2>
        <div className="mt-4 space-y-3">
          <Field label="Current email" htmlFor="current">
            <Input
              id="current"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="you@example.com"
              icon={<ShieldCheck className="size-[18px]" />}
            />
          </Field>
          <Field label="New email" htmlFor="email">
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new@example.com"
              icon={<ShieldCheck className="size-[18px]" />}
            />
          </Field>
        </div>
        <Button
          className="mt-5 w-full"
          size="lg"
          loading={emailLoading}
          onClick={changeEmail}
        >
          Save changes
        </Button>
        {emailResult && (
          <p
            className={`mt-3 text-center text-sm font-medium ${emailResult.ok ? "text-sage-500" : "text-coral-500"}`}
            role="status"
          >
            {emailResult.message}
          </p>
        )}
      </section>
    </PageShell>
  );
}
