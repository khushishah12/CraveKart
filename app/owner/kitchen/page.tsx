"use client";

import { useEffect, useState, useCallback } from "react";
import { CookingPot, Clock, ChevronRight } from "lucide-react";

import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

import { useIsRestaurantOwner } from "@/lib/auth";
import dynamic from "next/dynamic";

const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type KitchenOrder = {
  id: number;
  items: { name?: string; price?: number; qty?: number }[];
  total: number;
  status: string;
  created_at: string;
  restaurant_name?: string | null;
};

function money(n: number) {
  return `₹${Number(n).toFixed(2)}`;
}

function timeSince(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

const statusBorders: Record<string, string> = {
  pending: "border-l-4 border-l-amber-400",
  preparing: "border-l-4 border-l-indigo-500",
  ready: "border-l-4 border-l-sage-500",
  out_for_delivery: "border-l-4 border-l-primary-400",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function KitchenPage() {
  const isOwner = useIsRestaurantOwner();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = useCallback(() => {
    fetch("/api/owner/kitchen")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/owner/kitchen")
      .then((r) => r.json())
      .then((d) => active && setOrders(d.orders ?? []))
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function updateStatus(id: number, newStatus: string) {
    setUpdatingId(id);
    try {
      const r = await fetch("/api/owner/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, status: newStatus }),
      });
      if (r.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  }

  const nextStatus: Record<string, string> = {
    pending: "preparing",
    preparing: "ready",
    ready: "out_for_delivery",
  };

  const nextLabel: Record<string, string> = {
    pending: "Start Preparing",
    preparing: "Mark Ready",
    ready: "Out for Delivery",
  };

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
            icon={CookingPot}
            title="Kitchen"
            subtitle="Track and manage active orders in the kitchen."
            actions={
              <Badge tone="brand" dot>
                {orders.length} active
              </Badge>
            }
          />
          {loading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-44 animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<CookingPot className="size-10 text-ink-300" />}
              title="All caught up!"
              description="No active orders."
            />
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`card card-pad ${statusBorders[order.status] ?? "border-l-4 border-l-beige-300"} animate-fade-up`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm font-bold text-ink-900">
                      Order #{order.id}
                    </p>
                    <Badge
                      tone={
                        order.status === "pending"
                          ? "warning"
                          : order.status === "preparing"
                            ? "info"
                            : order.status === "ready"
                              ? "success"
                              : "brand"
                      }
                      dot
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </Badge>
                  </div>

                  <ul className="mt-3 space-y-1">
                    {(order.items ?? []).map((it, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-sm text-ink-600">
                        <ChevronRight className="size-3.5 shrink-0 text-ink-400" />
                        <span className="truncate">{it.name ?? "Item"}</span>
                        {it.qty && it.qty > 1 && (
                          <span className="text-xs text-ink-400">×{it.qty}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex items-center justify-between border-t border-beige-100 pt-3">
                    <div>
                      <p className="font-bold tabular text-ink-900">{money(order.total)}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
                        <Clock className="size-3" />
                        {timeSince(order.created_at)} ago
                      </p>
                    </div>
                    {nextStatus[order.status] && (
                      <Button
                        size="sm"
                        loading={updatingId === order.id}
                        onClick={() => updateStatus(order.id, nextStatus[order.status])}
                      >
                        {nextLabel[order.status]}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
