"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Pencil,
  Pizza,
  Plus,
  Save,
  Trash2,
  X,
  Tag,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";

import { useIsRestaurantOwner } from "@/lib/auth";

const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  available: boolean;
};

type FoodCategory = {
  id: string;
  name: string;
};

type MenuResponse = {
  items: MenuItem[];
  categories: FoodCategory[];
};

const tableHead =
  "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-400";
const tableCell = "px-4 py-3.5 align-middle";

function money(n: number) {
  return `₹${Number(n).toFixed(2)}`;
}

const emptyDraft = {
  name: "",
  description: "",
  price: "",
  category: "",
  image_url: "",
  available: true,
};

export default function OwnerMenuPage() {
  const isOwner = useIsRestaurantOwner();
  const [loading, setLoading] = useState(!isOwner);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    fetch("/api/owner/menu")
      .then((r) => r.json())
      .then((d: MenuResponse) => {
        if (!active) return;
        setItems(d.items ?? []);
        setCategories(d.categories ?? []);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOwner]);

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      category: item.category ?? "",
      image_url: item.image_url ?? "",
      available: item.available,
    });
    setShowCreate(false);
  }

  function startCreate() {
    setShowCreate(true);
    setEditingId(null);
    setDraft({ ...emptyDraft });
  }

  async function saveItem(id: string | null) {
    const price = Number(draft.price);
    if (!draft.name.trim() || Number.isNaN(price)) {
      setNotice({ ok: false, message: "Item needs a name and a valid price." });
      return;
    }
    setSavingId(id ?? "create");
    try {
      const isEdit = id !== null;
      const r = await fetch(isEdit ? `/api/owner/menu/${id}` : "/api/owner/menu", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          price,
          category: draft.category.trim() || null,
          description: draft.description.trim() || null,
          image_url: draft.image_url.trim() || null,
          available: draft.available,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        if (isEdit) {
          setItems((prev) =>
            prev.map((x) => (x.id === id ? { ...x, ...d.item ?? d } : x))
          );
        } else {
          setItems((prev) => [...prev, d.item ?? d]);
        }
        setEditingId(null);
        setShowCreate(false);
        setDraft(emptyDraft);
        setNotice({
          ok: true,
          message: isEdit ? "Item updated." : "Item created.",
        });
      } else {
        setNotice({ ok: false, message: d.error ?? "Something went wrong." });
      }
    } catch {
      setNotice({ ok: false, message: "Network error." });
    } finally {
      setSavingId(null);
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this item? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/owner/menu/${id}`, { method: "DELETE" });
      if (r.ok) {
        setItems((prev) => prev.filter((x) => x.id !== id));
        setNotice({ ok: true, message: "Item deleted." });
      } else {
        const d = await r.json();
        setNotice({ ok: false, message: d.error ?? "Failed to delete." });
      }
    } catch {
      setNotice({ ok: false, message: "Network error." });
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleAvailability(id: string, current: boolean) {
    setTogglingId(id);
    try {
      const r = await fetch(`/api/owner/menu/${id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !current }),
      });
      if (r.ok) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === id ? { ...x, available: !current } : x
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
    }
  }

  function updateDraft<K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <PageShell
      backHref="/"
      backLabel="Go home"
      maxWidth="max-w-6xl"
      right={<UserMenu />}
      roleNav
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
            icon={Pizza}
            title="Menu Items"
            subtitle="Add, edit, or remove items from your restaurant menu."
          />
          {notice && (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                notice.ok
                  ? "border-sage-200 bg-sage-50 text-sage-600"
                  : "border-coral-200 bg-coral-50 text-coral-600"
              }`}
              role="status"
            >
              {notice.message}
            </div>
          )}

          {loading ? (
            <div className="mt-8">
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-3xl" />
                ))}
              </div>
              <Skeleton className="mt-6 h-72 rounded-3xl" />
            </div>
          ) : (
            <div className="mt-8 grid gap-6">
              <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard
                  icon={Pizza}
                  label="Menu Items"
                  value={items.length}
                  tone="brand"
                />
                <StatCard
                  icon={Tag}
                  label="Categories"
                  value={categories.length}
                  tone="neutral"
                />
                <StatCard
                  icon={Pizza}
                  label="Available"
                  value={items.filter((i) => i.available).length}
                  tone="success"
                />
              </section>

              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-ink-900">
                  <Pizza className="size-5 text-primary-600" />
                  All Items
                </h2>
                <Button size="sm" onClick={startCreate}>
                  <Plus className="size-4" /> Add Item
                </Button>
              </div>

              {(showCreate || editingId) && (
                <section className="card card-pad max-w-2xl space-y-4">
                  <h3 className="font-bold text-ink-900">
                    {editingId ? "Edit Item" : "New Item"}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Name" htmlFor="item-name">
                      <Input
                        id="item-name"
                        value={draft.name}
                        onChange={(e) => updateDraft("name", e.target.value)}
                        placeholder="Item name"
                      />
                    </Field>
                    <Field label="Price" htmlFor="item-price">
                      <Input
                        id="item-price"
                        type="number"
                        step="0.01"
                        value={draft.price}
                        onChange={(e) => updateDraft("price", e.target.value)}
                        placeholder="0.00"
                      />
                    </Field>
                  </div>
                  <Field label="Category" htmlFor="item-category">
                    <select
                      id="item-category"
                      value={draft.category}
                      onChange={(e) => updateDraft("category", e.target.value)}
                      className="focus-ring h-11 w-full rounded-xl border border-beige-200 bg-surface-soft px-4 text-[15px] text-ink-900 shadow-soft transition-all duration-200 hover:border-beige-300 focus:border-primary-400 focus:bg-surface"
                    >
                      <option value="">No category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Description" htmlFor="item-desc">
                    <textarea
                      id="item-desc"
                      value={draft.description}
                      onChange={(e) =>
                        updateDraft("description", e.target.value)
                      }
                      className="focus-ring w-full rounded-xl border border-beige-200 bg-surface-soft px-4 py-3 text-[15px] text-ink-900 shadow-soft placeholder:text-ink-400 transition-all duration-200 hover:border-beige-300 focus:border-primary-400 focus:bg-surface"
                      rows={2}
                      placeholder="Short description"
                    />
                  </Field>
                  <Field label="Image URL" htmlFor="item-image">
                    <Input
                      id="item-image"
                      value={draft.image_url}
                      onChange={(e) => updateDraft("image_url", e.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draft.available}
                      onClick={() => updateDraft("available", !draft.available)}
                      className={`focus-ring relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        draft.available ? "bg-primary-500" : "bg-beige-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                          draft.available ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-[13px] font-semibold text-ink-800">
                      {draft.available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button
                      loading={savingId === (editingId ?? "create")}
                      onClick={() => saveItem(editingId)}
                    >
                      <Save className="size-4" />{" "}
                      {editingId ? "Save Changes" : "Create Item"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(null);
                        setShowCreate(false);
                        setDraft(emptyDraft);
                      }}
                    >
                      <X className="size-4" /> Cancel
                    </Button>
                  </div>
                </section>
              )}

              {items.length === 0 && !showCreate ? (
                <EmptyState
                  icon={<Pizza className="size-10 text-ink-300" />}
                  title="No menu items yet"
                  description="Add your first menu item to get started."
                  action={
                    <Button onClick={startCreate}>
                      <Plus className="size-4" /> Add Item
                    </Button>
                  }
                />
              ) : (
                <section className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream">
                        <tr className="border-b border-beige-100">
                          <th className={tableHead}>Name</th>
                          <th className={tableHead}>Category</th>
                          <th className={tableHead}>Price</th>
                          <th className={tableHead}>Available</th>
                          <th className={`${tableHead} text-right`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {items.map((item) => {
                          const isEditing = editingId === item.id;
                          return (
                            <tr
                              key={item.id}
                              className="transition-colors hover:bg-cream/70"
                            >
                              <td className={tableCell}>
                                {isEditing ? (
                                  <input
                                    value={draft.name}
                                    onChange={(e) =>
                                      updateDraft("name", e.target.value)
                                    }
                                    className="focus-ring h-9 w-full rounded-lg border border-beige-200 bg-surface-soft px-3 text-sm text-ink-900"
                                    placeholder="Item name"
                                  />
                                ) : (
                                  <>
                                    <p className="font-semibold text-ink-900">
                                      {item.name}
                                    </p>
                                    <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-ink-400">
                                      {item.description ?? ""}
                                    </p>
                                  </>
                                )}
                              </td>
                              <td className={tableCell}>
                                {isEditing ? (
                                  <select
                                    value={draft.category}
                                    onChange={(e) =>
                                      updateDraft("category", e.target.value)
                                    }
                                    className="focus-ring h-9 rounded-lg border border-beige-200 bg-surface-soft px-3 text-sm text-ink-900"
                                  >
                                    <option value="">None</option>
                                    {categories.map((c) => (
                                      <option key={c.id} value={c.name}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Badge tone="neutral">
                                    {item.category ?? "—"}
                                  </Badge>
                                )}
                              </td>
                              <td className={tableCell}>
                                {isEditing ? (
                                  <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
                                      ₹
                                    </span>
                                    <input
                                      value={draft.price}
                                      onChange={(e) =>
                                        updateDraft("price", e.target.value)
                                      }
                                      className="focus-ring h-9 w-24 rounded-lg border border-beige-200 bg-surface-soft pl-7 pr-3 text-sm text-ink-900 tabular"
                                      placeholder="0.00"
                                      inputMode="decimal"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-bold tabular text-ink-900">
                                    {money(item.price)}
                                  </span>
                                )}
                              </td>
                              <td className={tableCell}>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={item.available}
                                  disabled={togglingId === item.id}
                                  onClick={() =>
                                    toggleAvailability(item.id, item.available)
                                  }
                                  className={`focus-ring relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50 ${
                                    item.available
                                      ? "bg-primary-500"
                                      : "bg-beige-300"
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                                      item.available
                                        ? "translate-x-5"
                                        : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </td>
                              <td className={`${tableCell} text-right`}>
                                {isEditing ? (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      loading={savingId === item.id}
                                      onClick={() => saveItem(item.id)}
                                    >
                                      <Save className="size-4" /> Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => {
                                        setEditingId(null);
                                        setDraft(emptyDraft);
                                      }}
                                    >
                                      <X className="size-4" /> Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => startEdit(item)}
                                    >
                                      <Pencil className="size-4" /> Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      loading={deletingId === item.id}
                                      onClick={() => deleteItem(item.id)}
                                    >
                                      <Trash2 className="size-4" /> Delete
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {categories.length > 0 && (
                <section className="card card-pad">
                  <h2 className="flex items-center gap-2 font-bold text-ink-900">
                    <Tag className="size-5 text-primary-600" />
                    Categories
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <Badge key={c.id} tone="neutral">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
