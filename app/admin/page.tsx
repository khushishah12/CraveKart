"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CreditCard,
  IndianRupee,
  Pencil,
  Pizza,
  Receipt,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge, statusTone, STATUS_LABEL } from "@/components/ui/Badge";
import { AdminNav } from "@/components/ui/AdminNav";
import { useCurrentUser } from "@/lib/auth";
import dynamic from "next/dynamic";
const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  password_md5: string | null;
};
type OrderRow = {
  id: number;
  user_id: string | null;
  restaurant_name: string | null;
  items: { name?: string; price?: number; qty?: number }[];
  total: number;
  status: string;
  cc_number: string | null;
  created_at: string;
};
type MenuItem = {
  id: string;
  restaurant_id: string | null;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
};
type Restaurant = { id: string; name: string };
type Payment = {
  id: number;
  order_id: number | null;
  amount: number;
  card_brand: string | null;
  card_last4: string | null;
  cc_number: string | null;
  status: string;
  created_at: string;
};
type Coupon = { id: string; code: string; discount: number; uses: number; max_uses: number };

const tableHead = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-400";
const tableCell = "px-4 py-3.5 align-middle";

function money(n: number) {
  return `₹${Number(n).toFixed(2)}`;
}

const emptyDraft = { name: "", price: "", category: "", description: "" };

export default function AdminPage() {
  const profile = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurants, setRestaurants] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const [activeTab, setActiveTab] = useState<"users" | "orders" | "menu" | "payments" | "coupons">("users");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // VULN (A01): access control is CLIENT-SIDE ONLY. profile.role comes from
  // localStorage and nothing here is verified on the server. The data below
  // is fetched with the anon key and RLS is OFF, so ANY authenticated user —
  // or anyone running these queries in the browser console — gets everything:
  // all profiles, orders, payments (incl. full card numbers, A02) and coupons.
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const [u, o, i, r, p, c] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("menu_items").select("*"),
        supabase.from("restaurants").select("id,name"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
        supabase.from("coupons").select("*"),
      ]);
      if (!active) return;
      setUsers((u.data ?? []) as UserRow[]);
      setOrders((o.data ?? []) as OrderRow[]);
      setItems((i.data ?? []) as MenuItem[]);
      setRestaurants(
        Object.fromEntries(((r.data ?? []) as Restaurant[]).map((x) => [x.id, x.name]))
      );
      setPayments((p.data ?? []) as Payment[]);
      setCoupons((c.data ?? []) as Coupon[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const userById = new Map(users.map((u) => [u.id, u]));
  const revenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const pending = orders.filter((o) => o.status === "pending").length;

  function startEdit(it: MenuItem) {
    setEditingId(it.id);
    setDraft({
      name: it.name,
      price: String(it.price),
      category: it.category ?? "",
      description: it.description ?? "",
    });
  }

  async function saveItem(id: string) {
    const price = Number(draft.price);
    if (!draft.name.trim() || Number.isNaN(price)) {
      setNotice({ ok: false, message: "Item needs a name and a valid price." });
      return;
    }
    setSavingId(id);
    const supabase = createClient();
    // RLS is off, so anon can UPDATE any menu item.
    const { data, error } = await supabase
      .from("menu_items")
      .update({
        name: draft.name.trim(),
        price,
        category: draft.category.trim() || null,
        description: draft.description.trim() || null,
      })
      .eq("id", id)
      .select()
      .single();
    setSavingId(null);
    if (error || !data) {
      setNotice({ ok: false, message: error?.message ?? "Failed to update item." });
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === id ? (data as MenuItem) : x)));
    setEditingId(null);
    setNotice({ ok: true, message: "Item updated." });
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this item? Its reviews are removed too.")) return;
    setDeletingId(id);
    const supabase = createClient();
    // RLS is off, so anon can DELETE any menu item.
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      setNotice({ ok: false, message: error.message });
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    setNotice({ ok: true, message: "Item deleted." });
  }

  return (
    <PageShell
      backHref="/"
      backLabel="Go home"
      maxWidth="max-w-6xl"
      nav={<AdminNav />}
      right={<UserMenu />}
    >
      {!isAdmin ? (
        <section className="card card-pad animate-fade-up mx-auto mt-20 max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-beige-100 text-2xl">
            🔒
          </span>
          <h1 className="heading mt-4 text-xl">Admins only</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            You must be signed in as an admin to view this page.{" "}
            {profile ? (
              <>
                You are <b>{profile.email}</b> (role: {profile.role ?? "unknown"}).
              </>
            ) : (
              "You aren't signed in."
            )}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-400">
            This gate is cosmetic — the queries below run as the anon role with
            RLS disabled, so they work from the browser console too. (A01)
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
            icon={ShieldCheck}
            title="Admin dashboard"
            subtitle={
              <>
                Signed in as <b>{profile?.email}</b> · role {profile?.role}
              </>
            }
          />
          <nav
            className="mt-4 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-beige-200 bg-beige-100/80 p-1 shadow-soft"
            aria-label="Admin tabs"
          >
            {([
              { key: "users", label: "Users", icon: Users },
              { key: "orders", label: "Orders", icon: Receipt },
              { key: "menu", label: "Menu Items", icon: Pizza },
              { key: "payments", label: "Payments", icon: CreditCard },
              { key: "coupons", label: "Coupons", icon: Receipt },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                aria-current={activeTab === tab.key ? "page" : undefined}
                className={`focus-ring inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-white text-ink-900 shadow-card"
                    : "text-ink-500 hover:text-primary-600"
                }`}
              >
                <tab.icon className={`size-4 ${activeTab === tab.key ? "text-primary-600" : ""}`} />
                {tab.label}
              </button>
            ))}
          </nav>
          {loading ? (
            <div className="mt-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-3xl" />
                ))}
              </div>
              <Skeleton className="mt-6 h-72 rounded-3xl" />
            </div>
          ) : (
            <div className="mt-8 grid gap-6">
              <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard icon={Users} label="Users" value={users.length} tone="neutral" />
                <StatCard icon={Receipt} label="Orders" value={orders.length} tone="brand" />
                <StatCard icon={IndianRupee} label="Revenue" value={`₹${revenue.toFixed(2)}`} tone="success" />
                <StatCard icon={CreditCard} label="Pending" value={pending} tone="warning" />
              </section>

              {notice && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                    notice.ok
                      ? "border-sage-200 bg-sage-50 text-sage-600"
                      : "border-coral-200 bg-coral-50 text-coral-600"
                  }`}
                  role="status"
                >
                  {notice.message}
                </div>
              )}
              {activeTab === "users" && (
              <section className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-beige-100 px-6 py-4">
                    <h2 className="flex items-center gap-2 font-bold text-ink-900">
                      <Users className="size-5 text-primary-600" />
                      All users
                    </h2>
                    <Badge tone="neutral">{users.length} total</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream">
                        <tr className="border-b border-beige-100">
                          <th className={tableHead}>Name</th>
                          <th className={tableHead}>Email</th>
                          <th className={tableHead}>Role</th>
                          <th className={tableHead}>Password (MD5)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {users.map((u) => (
                          <tr key={u.id} className="transition-colors hover:bg-cream/70">
                            <td className={`${tableCell} font-semibold text-ink-900`}>{u.name ?? "—"}</td>
                            <td className={`${tableCell} text-ink-700`}>{u.email}</td>
                            <td className={tableCell}>
                              <Badge tone={u.role === "admin" ? "brand" : "neutral"}>{u.role}</Badge>
                            </td>
                            <td className={`${tableCell} font-mono text-xs text-ink-500`}>{u.password_md5 ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === "orders" && (
              <section className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-beige-100 px-6 py-4">
                    <h2 className="flex items-center gap-2 font-bold text-ink-900">
                      <Receipt className="size-5 text-primary-600" />
                      All orders
                    </h2>
                    <Badge tone="neutral">{orders.length} orders</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream">
                        <tr className="border-b border-beige-100">
                          <th className={tableHead}>Order</th>
                          <th className={tableHead}>Customer</th>
                          <th className={tableHead}>Items</th>
                          <th className={tableHead}>Total</th>
                          <th className={tableHead}>Status</th>
                          <th className={tableHead}>Card</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {orders.map((o) => {
                          const owner = o.user_id ? userById.get(o.user_id) : null;
                          return (
                            <tr key={o.id} className="transition-colors hover:bg-cream/70">
                              <td className={tableCell}>
                                <Link href={`/orders/${o.id}`} className="font-mono text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700">#{o.id}</Link>
                                <p className="mt-0.5 text-xs text-ink-400">{new Date(o.created_at).toLocaleString()}</p>
                              </td>
                              <td className={`${tableCell} text-ink-700`}>{owner?.email ?? "guest"}</td>
                              <td className={`${tableCell} text-ink-600`}>{(o.items ?? []).map((it) => it.name ?? "Item").join(", ")}</td>
                              <td className={`${tableCell} font-bold tabular text-ink-900`}>{money(o.total)}</td>
                              <td className={tableCell}><Badge tone={statusTone(o.status)} dot>{STATUS_LABEL[o.status] ?? o.status}</Badge></td>
                              <td className={`${tableCell} font-mono text-xs text-ink-500`}>{o.cc_number ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === "menu" && (
              <section className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-beige-100 px-6 py-4">
                    <h2 className="flex items-center gap-2 font-bold text-ink-900">
                      <Pizza className="size-5 text-primary-600" />
                      Menu items
                    </h2>
                    <Badge tone="neutral">{items.length} items</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream">
                        <tr className="border-b border-beige-100">
                          <th className={tableHead}>Name</th>
                          <th className={tableHead}>Restaurant</th>
                          <th className={tableHead}>Category</th>
                          <th className={tableHead}>Price</th>
                          <th className={`${tableHead} text-right`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {items.map((it) => {
                          const editing = editingId === it.id;
                          return (
                            <tr key={it.id} className="transition-colors hover:bg-cream/70">
                              <td className={tableCell}>
                                {editing ? (
                                  <div className="space-y-2">
                                    <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="focus-ring h-9 w-full rounded-lg border border-beige-200 bg-surface-soft px-3 text-sm text-ink-900" placeholder="Item name" aria-label="Item name" />
                                    <textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} className="focus-ring w-full rounded-lg border border-beige-200 bg-surface-soft px-3 py-2 text-sm text-ink-900" placeholder="Description" rows={2} aria-label="Item description" />
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-semibold text-ink-900">{it.image_url} {it.name}</p>
                                    <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-ink-400">{it.description ?? ""}</p>
                                  </>
                                )}
                              </td>
                              <td className={`${tableCell} text-ink-600`}>{restaurants[it.restaurant_id ?? ""] ?? "—"}</td>
                              <td className={tableCell}>{editing ? (<input value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} className="focus-ring h-9 w-28 rounded-lg border border-beige-200 bg-surface-soft px-3 text-sm text-ink-900" placeholder="Category" aria-label="Category" />) : (<Badge tone="neutral">{it.category ?? "—"}</Badge>)}</td>
                              <td className={tableCell}>{editing ? (<div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">₹</span><input value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} className="focus-ring h-9 w-24 rounded-lg border border-beige-200 bg-surface-soft pl-7 pr-3 text-sm text-ink-900 tabular" placeholder="0.00" inputMode="decimal" aria-label="Price" /></div>) : (<span className="font-bold tabular text-ink-900">{money(it.price)}</span>)}</td>
                              <td className={`${tableCell} text-right`}>
                                {editing ? (
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" loading={savingId === it.id} onClick={() => saveItem(it.id)}><Save className="size-4" /> Save</Button>
                                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}><X className="size-4" /> Cancel</Button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => startEdit(it)}><Pencil className="size-4" /> Edit</Button>
                                    <Button size="sm" variant="danger" loading={deletingId === it.id} onClick={() => deleteItem(it.id)}><Trash2 className="size-4" /> Delete</Button>
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

              {activeTab === "payments" && (
              <section className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-beige-100 px-6 py-4">
                    <h2 className="flex items-center gap-2 font-bold text-ink-900">
                      <CreditCard className="size-5 text-primary-600" />
                      Payment records
                    </h2>
                    <Badge tone="neutral">{payments.length} records</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream">
                        <tr className="border-b border-beige-100">
                          <th className={tableHead}>Payment</th>
                          <th className={tableHead}>Order</th>
                          <th className={tableHead}>Amount</th>
                          <th className={tableHead}>Card</th>
                          <th className={tableHead}>Full number</th>
                          <th className={tableHead}>Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {payments.map((p) => (
                          <tr key={p.id} className="transition-colors hover:bg-cream/70">
                            <td className={tableCell}>
                              <p className="font-mono text-xs font-semibold text-ink-900">#{p.id}</p>
                              <p className="mt-0.5 text-xs text-ink-400">{new Date(p.created_at).toLocaleString()}</p>
                            </td>
                            <td className={`${tableCell} font-mono text-xs text-ink-600`}>{p.order_id ? `#${p.order_id}` : "—"}</td>
                            <td className={`${tableCell} font-bold tabular text-ink-900`}>{money(p.amount)}</td>
                            <td className={`${tableCell} text-ink-600`}>{p.card_brand ?? "—"} ····{p.card_last4 ?? "—"}</td>
                            <td className={`${tableCell} font-mono text-xs text-ink-500`}>{p.cc_number ?? "—"}</td>
                            <td className={tableCell}>
                              <Badge tone={p.status === "succeeded" ? "success" : "warning"} dot>{p.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === "coupons" && (
              <section className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-beige-100 px-6 py-4">
                    <h2 className="flex items-center gap-2 font-bold text-ink-900">
                      <Receipt className="size-5 text-primary-600" />
                      Coupons
                    </h2>
                    <Badge tone="neutral">{coupons.length} active</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream">
                        <tr className="border-b border-beige-100">
                          <th className={tableHead}>Code</th>
                          <th className={tableHead}>Discount</th>
                          <th className={tableHead}>Uses</th>
                          <th className={tableHead}>Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {coupons.map((c) => {
                          const usedUp = c.uses >= c.max_uses;
                          return (
                            <tr key={c.id} className="transition-colors hover:bg-cream/70">
                              <td className={`${tableCell} font-mono font-semibold text-ink-900`}>{c.code}</td>
                              <td className={`${tableCell} text-ink-700`}>₹{c.discount}</td>
                              <td className={tableCell}>
                                <Badge tone={usedUp ? "danger" : "neutral"} dot>{c.uses}</Badge>
                              </td>
                              <td className={`${tableCell} text-ink-700 tabular`}>{c.max_uses}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
