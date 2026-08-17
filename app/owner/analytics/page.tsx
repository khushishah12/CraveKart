"use client";

import { useEffect, useState } from "react";
import { BarChart3, ShoppingCart, IndianRupee, Star, MessageSquareText, Pizza } from "lucide-react";

import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";

import { useIsRestaurantOwner } from "@/lib/auth";
import dynamic from "next/dynamic";

const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type AnalyticsData = {
  total_orders: number;
  revenue: number;
  avg_rating: number;
  total_reviews: number;
  total_menu_items: number;
  orders_by_status: { status: string; count: number }[];
  revenue_last_7_days: { date: string; amount: number }[];
  top_items: { name: string; order_count: number }[];
};

function money(n: number) {
  return `₹${Number(n).toFixed(2)}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  on_the_way: "On the Way",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-400",
  preparing: "bg-indigo-500",
  ready: "bg-sage-500",
  out_for_delivery: "bg-primary-500",
  delivered: "bg-sage-400",
  cancelled: "bg-coral-400",
  on_the_way: "bg-primary-400",
};

export default function AnalyticsPage() {
  const isOwner = useIsRestaurantOwner();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/owner/analytics")
      .then((r) => r.json())
      .then((d) => active && setData(d))
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const maxStatusCount = data
    ? Math.max(...data.orders_by_status.map((s) => s.count), 1)
    : 1;

  const maxRevenue = data
    ? Math.max(...data.revenue_last_7_days.map((d) => d.amount), 1)
    : 1;

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
            icon={BarChart3}
            title="Analytics"
            subtitle="Insights into your restaurant's performance."
          />
          {loading ? (
            <div className="mt-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-3xl" />
                ))}
              </div>
              <Skeleton className="mt-6 h-48 rounded-3xl" />
              <Skeleton className="mt-6 h-48 rounded-3xl" />
            </div>
          ) : data ? (
            <div className="mt-8 space-y-8">
              <section className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <StatCard icon={ShoppingCart} label="Total Orders" value={data.total_orders} tone="brand" />
                <StatCard icon={IndianRupee} label="Revenue" value={money(data.revenue)} tone="success" />
                <StatCard icon={Star} label="Avg Rating" value={data.avg_rating.toFixed(1)} tone="warning" />
                <StatCard icon={MessageSquareText} label="Total Reviews" value={data.total_reviews} tone="neutral" />
                <StatCard icon={Pizza} label="Menu Items" value={data.total_menu_items} tone="brand" />
              </section>

              <section className="card card-pad">
                <h2 className="font-bold text-ink-900">Orders by Status</h2>
                <div className="mt-4 space-y-3">
                  {data.orders_by_status.length === 0 ? (
                    <p className="text-sm text-ink-400">No data yet.</p>
                  ) : (
                    data.orders_by_status.map((item) => (
                      <div key={item.status} className="flex items-center gap-4">
                        <span className="w-32 shrink-0 text-sm font-medium text-ink-700">
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                        <div className="flex-1">
                          <div className="h-8 overflow-hidden rounded-lg bg-beige-100">
                            <div
                              className={`h-full rounded-lg ${STATUS_COLORS[item.status] ?? "bg-primary-500"}`}
                              style={{
                                width: `${(item.count / maxStatusCount) * 100}%`,
                                minWidth: item.count > 0 ? "2rem" : 0,
                              }}
                            />
                          </div>
                        </div>
                        <span className="w-12 text-right text-sm font-bold tabular text-ink-900">
                          {item.count}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="card card-pad">
                <h2 className="font-bold text-ink-900">Revenue — Last 7 Days</h2>
                <div className="mt-4 flex items-end gap-3" style={{ height: "12rem" }}>
                  {data.revenue_last_7_days.length === 0 ? (
                    <p className="text-sm text-ink-400">No data yet.</p>
                  ) : (
                    data.revenue_last_7_days.map((day) => (
                      <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                        <span className="text-[11px] font-bold tabular text-ink-700">
                          {money(day.amount)}
                        </span>
                        <div className="w-full" style={{ height: `${(day.amount / maxRevenue) * 100}%`, minHeight: day.amount > 0 ? "0.5rem" : 0 }}>
                          <div className="h-full w-full rounded-lg bg-primary-500" />
                        </div>
                        <span className="text-[10px] font-medium text-ink-400">
                          {new Date(day.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-beige-100 px-6 py-4">
                  <h2 className="flex items-center gap-2 font-bold text-ink-900">
                    <Pizza className="size-5 text-primary-600" />
                    Top Items
                  </h2>
                </div>
                {data.top_items.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-ink-400">
                    No data yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream">
                        <tr className="border-b border-beige-100">
                          <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-400">
                            Item
                          </th>
                          <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-400">
                            Orders
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {data.top_items.map((item, i) => (
                          <tr key={i} className="transition-colors hover:bg-cream/70">
                            <td className="px-4 py-3.5 align-middle font-semibold text-ink-900">
                              {item.name}
                            </td>
                            <td className="px-4 py-3.5 align-middle font-bold tabular text-ink-900">
                              {item.order_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
