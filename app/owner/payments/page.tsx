"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";

import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { useIsRestaurantOwner } from "@/lib/auth";
import dynamic from "next/dynamic";

const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type Payment = {
  id: number;
  order_id: number | null;
  amount: number;
  card_brand: string | null;
  card_last4: string | null;
  status: string;
  created_at: string;
};

const tableHead =
  "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-400";
const tableCell = "px-4 py-3.5 align-middle";

function money(n: number) {
  return `₹${Number(n).toFixed(2)}`;
}

export default function PaymentsPage() {
  const isOwner = useIsRestaurantOwner();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/owner/payments")
      .then((r) => r.json())
      .then((d) => active && setPayments(d.payments ?? []))
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const totalRevenue = payments
    .filter((p) => p.status === "succeeded")
    .reduce((s, p) => s + Number(p.amount || 0), 0);

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
            icon={Wallet}
            title="Payments"
            subtitle="View all payment records for your restaurant."
          />
          {loading ? (
            <div className="mt-8">
              <Skeleton className="h-24 rounded-3xl" />
              <Skeleton className="mt-6 h-72 rounded-3xl" />
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  icon={Wallet}
                  label="Total Revenue"
                  value={money(totalRevenue)}
                  tone="success"
                />
              </section>

              {payments.length === 0 ? (
                <EmptyState
                  icon={<Wallet className="size-10 text-ink-300" />}
                  title="No payment records yet."
                  description="Payment records will appear here once customers start ordering."
                />
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream">
                        <tr className="border-b border-beige-100">
                          <th className={tableHead}>ID</th>
                          <th className={tableHead}>Order</th>
                          <th className={tableHead}>Amount</th>
                          <th className={tableHead}>Card</th>
                          <th className={tableHead}>Status</th>
                          <th className={tableHead}>Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-beige-100">
                        {payments.map((p) => (
                          <tr key={p.id} className="transition-colors hover:bg-cream/70">
                            <td className={tableCell}>
                              <p className="font-mono text-xs font-semibold text-ink-900">
                                #{p.id}
                              </p>
                            </td>
                            <td className={`${tableCell} font-mono text-xs text-ink-600`}>
                              {p.order_id ? `#${p.order_id}` : "—"}
                            </td>
                            <td className={`${tableCell} font-bold tabular text-ink-900`}>
                              {money(p.amount)}
                            </td>
                            <td className={`${tableCell} text-ink-600`}>
                              {p.card_brand ?? "—"}
                              {p.card_last4 ? ` ····${p.card_last4}` : ""}
                            </td>
                            <td className={tableCell}>
                              <Badge
                                tone={p.status === "succeeded" ? "success" : "warning"}
                                dot
                              >
                                {p.status}
                              </Badge>
                            </td>
                            <td className={`${tableCell} text-xs text-ink-400`}>
                              {new Date(p.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                              <br />
                              <span className="text-[11px] text-ink-400">
                                {new Date(p.created_at).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
