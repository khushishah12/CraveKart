"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Store } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { OwnerNav } from "@/components/ui/OwnerNav";
import { useIsRestaurantOwner } from "@/lib/auth";

const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type RestaurantProfile = {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  description: string;
  contact_phone: string;
  contact_email: string;
  is_open: boolean;
  image_url: string;
};

export default function OwnerRestaurantPage() {
  const isOwner = useIsRestaurantOwner();
  const [loading, setLoading] = useState(!isOwner);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const [form, setForm] = useState<RestaurantProfile>({
    id: "",
    name: "",
    cuisine: "",
    address: "",
    description: "",
    contact_phone: "",
    contact_email: "",
    is_open: true,
    image_url: "",
  });

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    fetch("/api/owner/restaurant")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d) {
          setForm((prev) => ({ ...prev, ...d }));
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOwner]);

  function update<K extends keyof RestaurantProfile>(
    key: K,
    value: RestaurantProfile[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch("/api/owner/restaurant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (r.ok) {
        setNotice({ ok: true, message: "Restaurant profile saved." });
        if (d.id) setForm((prev) => ({ ...prev, id: d.id }));
      } else {
        setNotice({ ok: false, message: d.error ?? "Failed to save." });
      }
    } catch {
      setNotice({ ok: false, message: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      backHref="/"
      backLabel="Go home"
      maxWidth="max-w-6xl"
      right={<UserMenu />}
    >
      {!isOwner ? (
        <section className="card card-pad animate-fade-up mx-auto mt-20 max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-beige-100 text-2xl">
            🔒
          </span>
          <h1 className="heading mt-4 text-xl">Access denied</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            You must be signed in as a restaurant owner to view this page.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
          </div>
        </section>
      ) : (
        <>
          <PageHeader
            icon={Store}
            title="Restaurant Profile"
            subtitle="Manage your restaurant details and contact information."
          />
          <OwnerNav />

          {loading ? (
            <div className="mt-8 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="mt-8">
              {notice && (
                <div
                  className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
                    notice.ok
                      ? "border-sage-200 bg-sage-50 text-sage-600"
                      : "border-coral-200 bg-coral-50 text-coral-600"
                  }`}
                  role="status"
                >
                  {notice.message}
                </div>
              )}

              <section className="card card-pad max-w-2xl space-y-5">
                <Field label="Restaurant Name" htmlFor="name">
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. CraveKart Kitchen"
                  />
                </Field>

                <Field label="Cuisine" htmlFor="cuisine">
                  <Input
                    id="cuisine"
                    value={form.cuisine}
                    onChange={(e) => update("cuisine", e.target.value)}
                    placeholder="e.g. North Indian, Chinese"
                  />
                </Field>

                <Field label="Address" htmlFor="address">
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="Full address"
                  />
                </Field>

                <Field label="Description" htmlFor="description">
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    className="focus-ring w-full rounded-xl border border-beige-200 bg-surface-soft px-4 py-3 text-[15px] text-ink-900 shadow-soft placeholder:text-ink-400 transition-all duration-200 hover:border-beige-300 focus:border-primary-400 focus:bg-surface"
                    rows={3}
                    placeholder="A short description of your restaurant"
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Contact Phone" htmlFor="contact_phone">
                    <Input
                      id="contact_phone"
                      value={form.contact_phone}
                      onChange={(e) => update("contact_phone", e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                  <Field label="Contact Email" htmlFor="contact_email">
                    <Input
                      id="contact_email"
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => update("contact_email", e.target.value)}
                      placeholder="hello@example.com"
                    />
                  </Field>
                </div>

                <Field label="Image URL" htmlFor="image_url">
                  <Input
                    id="image_url"
                    value={form.image_url}
                    onChange={(e) => update("image_url", e.target.value)}
                    placeholder="https://..."
                  />
                </Field>

                <div className="flex items-center gap-3">
                  <label htmlFor="is_open" className="flex items-center gap-2">
                    <button
                      id="is_open"
                      type="button"
                      role="switch"
                      aria-checked={form.is_open}
                      onClick={() => update("is_open", !form.is_open)}
                      className={`focus-ring relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        form.is_open ? "bg-primary-500" : "bg-beige-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                          form.is_open ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-[13px] font-semibold text-ink-800">
                      {form.is_open ? "Open" : "Closed"}
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <Button loading={saving} onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
