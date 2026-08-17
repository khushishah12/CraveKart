"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  CookingPot,
  Megaphone,
  Pizza,
  Star,
  Store,
  TrendingUp,
  ShoppingCart,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge, statusTone, STATUS_LABEL } from "@/components/ui/Badge";
import { useCurrentUser, useIsRestaurantOwner } from "@/lib/auth";

const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type AnalyticsData = {
  totalOrders: number;
  revenue: number;
  pendingOrders: number;
  averageRating: number;
};

type RecentOrder = {
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

export default function OwnerDashboardPage() {
  const profile = useCurrentUser();
  const isOwner = useIsRestaurantOwner();
  const [loading, setLoading] = useState(!isOwner);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    Promise.all([
      fetch("/api/owner/analytics").then((r) => r.json()),
      fetch("/api/owner/orders").then((r) => r.json()),
    ])
      .then(([a, o]) => {
        if (!active) return;
        setAnalytics(a);
        setRecentOrders((o.orders ?? []).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOwner]);

  return (
    <PageShell
      backHref="/"
      backLabel="Go home"
      maxWidth="max-w-6xl"
      roleNav
      right={<UserMenu />}
    >
      {!isOwner ? (
        <section className="card card-pad animate-fade-up mx-auto mt-20 max-w-md text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-beige-100 text-2xl">
            🔒
          </span>
          <h1 className="heading mt-4 text-xl">Access denied</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            You must be signed in as a restaurant owner to view this page.{" "}
            {profile ? (
              <>
                You are <b>{profile.email}</b> (role: {profile.role ?? "unknown"}).
              </>
            ) : (
              "You aren't signed in."
            )}
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
            title="Restaurant Dashboard"
            subtitle={
              <>
                Signed in as <b>{profile?.email}</b> · role {profile?.role}
              </>
            }
          />

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
                <StatCard
                  icon={ShoppingCart}
                  label="Total Orders"
                  value={analytics?.totalOrders ?? 0}
                  tone="brand"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Revenue"
                  value={money(analytics?.revenue ?? 0)}
                  tone="success"
                />
                <StatCard
                  icon={Clock}
                  label="Pending Orders"
                  value={analytics?.pendingOrders ?? 0}
                  tone="warning"
                />
                <StatCard
                  icon={Star}
                  label="Average Rating"
                  value={analytics?.averageRating?.toFixed(1) ?? "—"}
                  tone="neutral"
                />
              </section>

              <div className="grid gap-6 sm:grid-cols-2">
                <section className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-beige-100 px-6 py-4">
                    <h2 className="flex items-center gap-2 font-bold text-ink-900">
                      <ClipboardList className="size-5 text-primary-600" />
                      Recent Orders
                    </h2>
                    <Badge tone="neutral">{recentOrders.length} latest</Badge>
                  </div>
                  {recentOrders.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-ink-500">
                      No orders yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-cream">
                          <tr className="border-b border-beige-100">
                            <th className={tableHead}>Order</th>
                            <th className={tableHead}>Items</th>
                            <th className={tableHead}>Total</th>
                            <th className={tableHead}>Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-beige-100">
                          {recentOrders.map((o) => (
                            <tr
                              key={o.id}
                              className="transition-colors hover:bg-cream/70"
                            >
                              <td className={tableCell}>
                                <p className="font-mono text-xs font-semibold text-ink-900">
                                  #{o.id}
                                </p>
                                <p className="mt-0.5 text-xs text-ink-400">
                                  {new Date(o.created_at).toLocaleDateString()}
                                </p>
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="card card-pad">
                  <h2 className="flex items-center gap-2 font-bold text-ink-900">
                    <Store className="size-5 text-primary-600" />
                    Quick Actions
                  </h2>
                  <div className="mt-4 grid gap-3">
                    <Link href="/owner/menu">
                      <Button variant="secondary" className="w-full justify-start">
                        <Pizza className="size-4" /> Manage Menu
                      </Button>
                    </Link>
                    <Link href="/owner/orders">
                      <Button variant="secondary" className="w-full justify-start">
                        <ClipboardList className="size-4" /> View Orders
                      </Button>
                    </Link>
                    <Link href="/owner/kitchen">
                      <Button variant="secondary" className="w-full justify-start">
                        <CookingPot className="size-4" /> Kitchen View
                      </Button>
                    </Link>
                    <Link href="/owner/offers">
                      <Button variant="secondary" className="w-full justify-start">
                        <Megaphone className="size-4" /> Manage Offers
                      </Button>
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
