"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Receipt } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge, statusTone, STATUS_LABEL } from "@/components/ui/Badge";
import { RequireCustomer } from "@/components/ui/RequireCustomer";

type Order = {
  id: number;
  restaurant_name: string;
  total: number;
  status: string;
  created_at: string;
  cc_number: string | null;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => active && setOrders(d.orders ?? []))
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <RequireCustomer>
    <PageShell backHref="/menu" backLabel="Back to menu" maxWidth="max-w-3xl" roleNav>
      <PageHeader
        icon={Receipt}
        title="Your orders"
        subtitle="Showing every order on record — no login required. 🔓"
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
            <Link key={o.id} href={`/orders/${o.id}`} className="focus-ring block rounded-3xl">
              <article className="card card-hover flex items-center gap-4 p-5">
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
                <div className="hidden sm:block">
                  <Badge tone={statusTone(o.status)} dot>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </Badge>
                </div>
                <span className="text-lg font-extrabold tabular text-ink-900">
                  ₹{Number(o.total).toFixed(2)}
                </span>
                <ArrowRight className="size-4 shrink-0 text-ink-400 transition-transform duration-200 group-hover:translate-x-0.5" />
              </article>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
    </RequireCustomer>
  );
}
