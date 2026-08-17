"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  CheckCircle,
  ChefHat,
  Truck,
  PackageCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge, statusTone, STATUS_LABEL } from "@/components/ui/Badge";

import { useIsRestaurantOwner } from "@/lib/auth";

const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type OwnerOrder = {
  id: number;
  customer_name: string | null;
  items: { name?: string; price?: number; qty?: number }[];
  total: number;
  status: string;
  created_at: string;
};

const tableHead =
  "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-400";
const tableCell = "px-4 py-3.5 align-middle";

function money(n: number) {
  return `₹${Number(n).toFixed(2)}`;
}

const STATUS_FLOW: Record<string, { label: string; icon: typeof CheckCircle; next: string }[]> = {
  pending: [
    { label: "Accept", icon: ChefHat, next: "preparing" },
    { label: "Cancel", icon: XCircle, next: "cancelled" },
  ],
  preparing: [
    { label: "Ready", icon: CheckCircle, next: "ready" },
    { label: "Cancel", icon: XCircle, next: "cancelled" },
  ],
  ready: [
    { label: "Out for Delivery", icon: Truck, next: "on_the_way" },
  ],
  on_the_way: [
    { label: "Delivered", icon: PackageCheck, next: "delivered" },
  ],
};

export default function OwnerOrdersPage() {
  const isOwner = useIsRestaurantOwner();
  const [loading, setLoading] = useState(!isOwner);
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    fetch("/api/owner/orders")
      .then((r) => r.json())
      .then((d) => active && setOrders(d.orders ?? []))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOwner]);

  async function updateStatus(id: number, status: string) {
    setUpdatingId(id);
    setNotice(null);
    try {
      const r = await fetch(`/api/owner/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (r.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status } : o))
        );
        setNotice({
          ok: true,
          message: `Order #${id} updated to ${STATUS_LABEL[status] ?? status}.`,
        });
      } else {
        setNotice({ ok: false, message: d.error ?? "Failed to update order." });
      }
    } catch {
      setNotice({ ok: false, message: "Network error." });
    } finally {
      setUpdatingId(null);
    }
  }

  const pending = orders.filter((o) => o.status === "pending").length;
  const preparing = orders.filter((o) => o.status === "preparing").length;

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
            icon={ClipboardList}
            title="Orders"
            subtitle={
              <>
                Manage incoming orders.{" "}
                <Badge tone="brand">{orders.length} total</Badge>
              </>
            }
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
              <section className="grid grid-cols-3 gap-4">
                <StatCard
                  icon={ClipboardList}
                  label="Total Orders"
                  value={orders.length}
                  tone="brand"
                />
                <StatCard
                  icon={ChefHat}
                  label="Pending"
                  value={pending}
                  tone="warning"
                />
                <StatCard
                  icon={Truck}
                  label="Preparing"
                  value={preparing}
                  tone="brand"
                />
              </section>

              {orders.length === 0 ? (
                <div className="card card-pad text-center">
                  <p className="text-sm text-ink-500">No orders yet.</p>
                </div>
              ) : (
                <section className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream">
                        <tr className="border-b border-beige-100">
                          <th className={tableHead}>Order</th>
                          <th className={tableHead}>Customer</th>
                          <th className={tableHead}>Items</th>
                          <th className={tableHead}>Total</th>
                          <th className={tableHead}>Status</th>
                          <th className={tableHead}>Date</th>
                          <th className={`${tableHead} text-right`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {orders.map((o) => {
                          const actions = STATUS_FLOW[o.status] ?? [];
                          return (
                            <tr
                              key={o.id}
                              className="transition-colors hover:bg-cream/70"
                            >
                              <td className={tableCell}>
                                <p className="font-mono text-xs font-semibold text-ink-900">
                                  #{o.id}
                                </p>
                              </td>
                              <td className={`${tableCell} text-ink-700`}>
                                {o.customer_name ?? "Guest"}
                              </td>
                              <td className={`${tableCell} text-ink-600`}>
                                {(o.items ?? [])
                                  .map((it) => it.name ?? "Item")
                                  .join(", ")}
                              </td>
                              <td
                                className={`${tableCell} font-bold tabular text-ink-900`}
                              >
                                {money(o.total)}
                              </td>
                              <td className={tableCell}>
                                <Badge tone={statusTone(o.status)} dot>
                                  {STATUS_LABEL[o.status] ?? o.status}
                                </Badge>
                              </td>
                              <td className={`${tableCell} text-xs text-ink-500`}>
                                {new Date(o.created_at).toLocaleDateString()}
                              </td>
                              <td className={`${tableCell} text-right`}>
                                {actions.length > 0 && (
                                  <div className="flex justify-end gap-2">
                                    {actions.map((a) => (
                                      <Button
                                        key={a.next}
                                        size="sm"
                                        variant={
                                          a.next === "cancelled"
                                            ? "danger"
                                            : "secondary"
                                        }
                                        loading={updatingId === o.id}
                                        onClick={() =>
                                          updateStatus(o.id, a.next)
                                        }
                                      >
                                        <a.icon className="size-4" /> {a.label}
                                      </Button>
                                    ))}
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
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
