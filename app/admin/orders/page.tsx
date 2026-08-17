"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, statusTone, STATUS_LABEL } from "@/components/ui/Badge";
import { AdminNav } from "@/components/ui/AdminNav";
import { useCurrentUser } from "@/lib/auth";
import dynamic from "next/dynamic";
const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type AdminOrder = {
  id: number;
  user_id: string | null;
  restaurant_name: string | null;
  items: { name?: string; price?: number; qty?: number }[];
  total: number;
  status: string;
  created_at: string;
  cc_number: string | null;
};

const tableHead = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-400";
const tableCell = "px-4 py-3.5 align-middle";

function money(n: number) {
  return `₹${Number(n).toFixed(2)}`;
}

export default function AdminOrdersPage() {
  const profile = useCurrentUser();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ ok?: boolean; message: string } | null>(null);
  const [marking, setMarking] = useState<number | null>(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    let active = true;
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((d) => active && setOrders(d.orders ?? []))
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function markComplete(id: number) {
    setMarking(id);
    setResult(null);
    try {
      const r = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });
      const d = await r.json();
      if (r.ok) {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "delivered" } : o)));
        setResult({ ok: true, message: "Order marked as delivered." });
      } else {
        setResult({ message: d.error ?? "Something went wrong." });
      }
    } catch {
      setResult({ message: "Network error." });
    } finally {
      setMarking(null);
    }
  }

  return (
    <PageShell
      backHref="/admin"
      backLabel="Back to dashboard"
      maxWidth="max-w-5xl"
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
            You must be signed in as an admin to view this page.
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
            icon={Receipt}
            title="Orders"
            subtitle="Everything your customers have ordered, in one place."
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

          {loading ? (
            <div className="mt-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card h-20 animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="card card-pad mt-8 text-center">
              <p className="text-sm text-ink-500">No orders yet.</p>
            </div>
          ) : (
            <div className="card mt-8 overflow-hidden">
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
                      <th className={tableHead}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-beige-100">
                    {orders.map((o) => (
                      <tr key={o.id} className="transition-colors hover:bg-cream/70">
                        <td className={`${tableCell}`}>
                          <p className="font-mono text-xs font-semibold text-ink-900">
                            Order #{o.id}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-400">
                            {new Date(o.created_at).toLocaleString()}
                          </p>
                        </td>
                        <td className={`${tableCell} text-ink-700`}>
                          {o.restaurant_name ?? "Walk-in"}
                          <p className="mt-0.5 font-mono text-[11px] text-ink-400">
                            {o.user_id ?? "guest"}
                          </p>
                        </td>
                        <td className={`${tableCell} text-ink-600`}>
                          {(o.items ?? []).map((it) => it.name ?? "Item").join(", ")}
                        </td>
                        <td className={`${tableCell} font-bold tabular text-ink-900`}>
                          {money(o.total)}
                        </td>
                        <td className={tableCell}>
                          <Badge tone={statusTone(o.status)} dot>
                            {STATUS_LABEL[o.status] ?? o.status}
                          </Badge>
                        </td>
                        <td className={`${tableCell} font-mono text-xs text-ink-500`}>
                          {o.cc_number ?? "—"}
                        </td>
                        <td className={tableCell}>
                          {o.status === "pending" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={marking === o.id}
                              onClick={() => markComplete(o.id)}
                            >
                              Mark delivered
                            </Button>
                          )}
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
