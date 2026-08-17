"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Receipt, X } from "lucide-react";

import { useCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge, statusTone, STATUS_LABEL } from "@/components/ui/Badge";
import { RequireCustomer } from "@/components/ui/RequireCustomer";

type Order = {
  id: number;
  user_id: string | null;
  restaurant_name: string;
  total: number;
  status: string;
  created_at: string;
};

function canCancel(status: string): boolean {
  return status === "pending" || status === "preparing";
}

export default function OrdersPage() {
  const profile = useCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const all = (d.orders ?? []) as Order[];
        // VULN: client-side filtering only — the API returns ALL orders.
        // Anyone can see other users' orders by hitting the API directly.
        const filtered = profile?.id
          ? all.filter((o) => o.user_id === profile.id)
          : all;
        setOrders(filtered);
      })
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [profile?.id]);

  async function cancelOrder(orderId: number) {
    if (!confirm("Cancel this order?")) return;
    setCancelling(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o))
        );
      }
    } catch {
      // silently fail
    } finally {
      setCancelling(null);
    }
  }

  return (
    <RequireCustomer>
      <PageShell backHref="/menu" backLabel="Back to menu" maxWidth="max-w-3xl" roleNav>
        <PageHeader
          icon={Receipt}
          title="Your orders"
          subtitle={
            profile
              ? `Showing orders for ${profile.email}`
              : "Showing all orders — sign in to see only yours."
          }
        />

        {loading ? (
          <CardSkeleton count={3} height="h-28" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No orders yet"
            description="When you place an order it will show up here."
            action={
              <Link href="/menu">
                <Button>Order something delicious</Button>
              </Link>
            }
          />
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((o) => (
              <article key={o.id} className="card flex items-center gap-4 p-5">
                <Link href={`/orders/${o.id}`} className="focus-ring flex min-w-0 flex-1 items-center gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-beige-100 to-primary-50 text-xl">
                    🧾
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink-900">
                      {o.restaurant_name}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">
                      {new Date(o.created_at).toLocaleString()} ·{" "}
                      <span className="font-mono">Order #{o.id}</span>
                    </p>
                  </div>
                  <div className="hidden shrink-0 sm:block">
                    <Badge tone={statusTone(o.status)} dot>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                  </div>
                  <span className="shrink-0 text-lg font-extrabold tabular text-ink-900">
                    ₹{Number(o.total).toFixed(2)}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-ink-400" />
                </Link>
                {canCancel(o.status) && (
                  <button
                    onClick={() => cancelOrder(o.id)}
                    disabled={cancelling === o.id}
                    className="focus-ring shrink-0 grid size-9 place-items-center rounded-full text-coral-500 transition-colors hover:bg-coral-400/10 disabled:opacity-50"
                    aria-label={`Cancel order #${o.id}`}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </PageShell>
    </RequireCustomer>
  );
}
