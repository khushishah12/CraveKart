"use client";

import { useEffect, useState } from "react";
import { Megaphone, Pencil, Trash2, Plus, X } from "lucide-react";

import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { useIsRestaurantOwner } from "@/lib/auth";
import dynamic from "next/dynamic";

const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type Offer = {
  id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order: number | null;
  max_discount: number | null;
  code: string | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

const emptyOffer: Omit<Offer, "id"> = {
  title: "",
  description: "",
  discount_type: "percentage",
  discount_value: 0,
  min_order: null,
  max_discount: null,
  code: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

const tableHead =
  "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-400";
const tableCell = "px-4 py-3.5 align-middle";

function money(n: number) {
  return `₹${Number(n).toFixed(2)}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OffersPage() {
  const isOwner = useIsRestaurantOwner();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyOffer);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/owner/offers")
      .then((r) => r.json())
      .then((d) => active && setOffers(d.offers ?? []))
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function startCreate() {
    setEditingId(null);
    setDraft(emptyOffer);
    setShowForm(true);
    setResult(null);
  }

  function startEdit(offer: Offer) {
    setEditingId(offer.id);
    setDraft({
      title: offer.title,
      description: offer.description ?? "",
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      min_order: offer.min_order,
      max_discount: offer.max_discount,
      code: offer.code ?? "",
      starts_at: offer.starts_at ? offer.starts_at.slice(0, 10) : "",
      expires_at: offer.expires_at ? offer.expires_at.slice(0, 10) : "",
      is_active: offer.is_active,
    });
    setShowForm(true);
    setResult(null);
  }

  async function saveOffer() {
    if (!draft.title.trim()) {
      setResult({ ok: false, message: "Title is required." });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/owner/offers`
        : `/api/owner/offers`;
      const body = editingId
        ? { ...draft, id: editingId }
        : draft;
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok) {
        if (editingId) {
          setOffers((prev) =>
            prev.map((o) => (o.id === editingId ? d.offer : o))
          );
        } else {
          setOffers((prev) => [d.offer, ...prev]);
        }
        setShowForm(false);
        setEditingId(null);
        setDraft(emptyOffer);
        setResult({
          ok: true,
          message: editingId ? "Offer updated." : "Offer created.",
        });
      } else {
        setResult({ ok: false, message: d.error ?? "Something went wrong." });
      }
    } catch {
      setResult({ ok: false, message: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteOffer(id: string) {
    if (!window.confirm("Delete this offer?")) return;
    setDeletingId(id);
    try {
      const r = await fetch("/api/owner/offers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (r.ok) {
        setOffers((prev) => prev.filter((o) => o.id !== id));
        setResult({ ok: true, message: "Offer deleted." });
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageShell backHref="/" backLabel="Go home" right={<UserMenu />} maxWidth="max-w-6xl" roleNav>
      {!isOwner ? (
        <section className="card card-pad animate-fade-up mx-auto mt-20 max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-beige-100 text-2xl">
            🔒
          </span>
          <h1 className="heading mt-4 text-xl">Access denied</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            You must be signed in as a restaurant owner to view this page.
          </p>
        </section>
      ) : (
        <>
          <PageHeader
            icon={Megaphone}
            title="Offers & Discounts"
            subtitle="Create and manage promotional offers for your customers."
            actions={
              <Button onClick={startCreate}>
                <Plus className="size-4" /> Create offer
              </Button>
            }
          />
          {result && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                result.ok
                  ? "border-sage-200 bg-sage-50 text-sage-600"
                  : "border-coral-200 bg-coral-50 text-coral-600"
              }`}
              role="status"
            >
              {result.message}
            </div>
          )}

          {showForm && (
            <div className="card card-pad mt-6 animate-fade-up">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-ink-900">
                  {editingId ? "Edit Offer" : "New Offer"}
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold tracking-wide text-ink-800">
                    Title *
                  </label>
                  <input
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, title: e.target.value }))
                    }
                    className="focus-ring h-11 w-full rounded-xl border border-beige-200 bg-surface-soft px-4 text-[15px] text-ink-900 shadow-soft placeholder:text-ink-400"
                    placeholder="Summer Sale"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold tracking-wide text-ink-800">
                    Code
                  </label>
                  <input
                    value={draft.code ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, code: e.target.value }))
                    }
                    className="focus-ring h-11 w-full rounded-xl border border-beige-200 bg-surface-soft px-4 text-[15px] font-mono text-ink-900 shadow-soft placeholder:text-ink-400"
                    placeholder="SUMMER20"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[13px] font-semibold tracking-wide text-ink-800">
                    Description
                  </label>
                  <textarea
                    value={draft.description ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, description: e.target.value }))
                    }
                    className="focus-ring w-full rounded-xl border border-beige-200 bg-surface-soft px-4 py-3 text-sm text-ink-900 shadow-soft placeholder:text-ink-400"
                    rows={2}
                    placeholder="Describe this offer..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold tracking-wide text-ink-800">
                    Discount Type
                  </label>
                  <select
                    value={draft.discount_type}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, discount_type: e.target.value }))
                    }
                    className="focus-ring h-11 w-full rounded-xl border border-beige-200 bg-surface-soft px-4 text-[15px] text-ink-900 shadow-soft"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold tracking-wide text-ink-800">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    value={draft.discount_value || ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        discount_value: Number(e.target.value),
                      }))
                    }
                    className="focus-ring h-11 w-full rounded-xl border border-beige-200 bg-surface-soft px-4 text-[15px] text-ink-900 shadow-soft placeholder:text-ink-400"
                    placeholder="10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold tracking-wide text-ink-800">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    value={draft.min_order ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        min_order: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="focus-ring h-11 w-full rounded-xl border border-beige-200 bg-surface-soft px-4 text-[15px] text-ink-900 shadow-soft placeholder:text-ink-400"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold tracking-wide text-ink-800">
                    Max Discount (₹)
                  </label>
                  <input
                    type="number"
                    value={draft.max_discount ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        max_discount: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="focus-ring h-11 w-full rounded-xl border border-beige-200 bg-surface-soft px-4 text-[15px] text-ink-900 shadow-soft placeholder:text-ink-400"
                    placeholder="N/A"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold tracking-wide text-ink-800">
                    Starts At
                  </label>
                  <input
                    type="date"
                    value={draft.starts_at ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, starts_at: e.target.value }))
                    }
                    className="focus-ring h-11 w-full rounded-xl border border-beige-200 bg-surface-soft px-4 text-[15px] text-ink-900 shadow-soft"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold tracking-wide text-ink-800">
                    Expires At
                  </label>
                  <input
                    type="date"
                    value={draft.expires_at ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, expires_at: e.target.value }))
                    }
                    className="focus-ring h-11 w-full rounded-xl border border-beige-200 bg-surface-soft px-4 text-[15px] text-ink-900 shadow-soft"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-ink-800">
                    <input
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, is_active: e.target.checked }))
                      }
                      className="size-4 rounded border-beige-300"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Button loading={saving} onClick={saveOffer}>
                  {editingId ? "Update Offer" : "Create Offer"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="mt-8 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-3xl" />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="size-10 text-ink-300" />}
              title="No offers yet."
              description="Create your first offer to attract more customers."
              action={
                <Button onClick={startCreate}>
                  <Plus className="size-4" /> Create offer
                </Button>
              }
            />
          ) : (
            <div className="card mt-8 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-cream">
                    <tr className="border-b border-beige-100">
                      <th className={tableHead}>Title</th>
                      <th className={tableHead}>Type</th>
                      <th className={tableHead}>Value</th>
                      <th className={tableHead}>Min Order</th>
                      <th className={tableHead}>Code</th>
                      <th className={tableHead}>Active</th>
                      <th className={tableHead}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-beige-100">
                    {offers.map((offer) => (
                      <tr key={offer.id} className="transition-colors hover:bg-cream/70">
                        <td className={tableCell}>
                          <p className="font-semibold text-ink-900">{offer.title}</p>
                          {offer.description && (
                            <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-ink-400">
                              {offer.description}
                            </p>
                          )}
                          {offer.starts_at || offer.expires_at ? (
                            <p className="mt-0.5 text-[11px] text-ink-400">
                              {formatDate(offer.starts_at)} — {formatDate(offer.expires_at)}
                            </p>
                          ) : null}
                        </td>
                        <td className={tableCell}>
                          <Badge tone="info">
                            {offer.discount_type === "percentage" ? "%" : "Flat"}
                          </Badge>
                        </td>
                        <td className={`${tableCell} font-bold tabular text-ink-900`}>
                          {offer.discount_type === "percentage"
                            ? `${offer.discount_value}%`
                            : money(offer.discount_value)}
                          {offer.max_discount != null && (
                            <p className="text-[11px] font-normal text-ink-400">
                              max {money(offer.max_discount)}
                            </p>
                          )}
                        </td>
                        <td className={`${tableCell} tabular text-ink-700`}>
                          {offer.min_order != null ? money(offer.min_order) : "—"}
                        </td>
                        <td className={`${tableCell} font-mono text-xs font-semibold text-ink-900`}>
                          {offer.code ?? "—"}
                        </td>
                        <td className={tableCell}>
                          <Badge tone={offer.is_active ? "success" : "neutral"} dot>
                            {offer.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className={tableCell}>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => startEdit(offer)}
                            >
                              <Pencil className="size-3.5" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              loading={deletingId === offer.id}
                              onClick={() => deleteOffer(offer.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
