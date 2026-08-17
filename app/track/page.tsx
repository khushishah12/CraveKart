"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bike,
  Check,
  ChefHat,
  Clock,
  HandPlatter,
  Home,
  PackageCheck,
  PackageSearch,
  Search,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, statusTone, STATUS_LABEL } from "@/components/ui/Badge";
import { RequireCustomer } from "@/components/ui/RequireCustomer";

type CartLine = { id?: string; name?: string; price?: number; qty?: number };
type Order = {
  id: number;
  restaurant_name: string;
  items: CartLine[];
  total: number;
  status: string;
  delivery_address: string | null;
  created_at: string;
};

const STEPS = [
  { label: "Placed", icon: Home },
  { label: "Preparing", icon: ChefHat },
  { label: "Ready", icon: HandPlatter },
  { label: "On the Way", icon: Bike },
  { label: "Delivered", icon: PackageCheck },
] as const;

function statusStep(status: string): number {
  switch (status) {
    case "preparing": return 1;
    case "ready": return 2;
    case "on_the_way": return 3;
    case "delivered": return 4;
    default: return 0;
  }
}

function statusMessage(status: string): string {
  switch (status) {
    case "pending": return "Waiting for the restaurant to accept your order.";
    case "preparing": return "The kitchen is working on your food!";
    case "ready": return "Your order is ready for pickup by the delivery partner.";
    case "on_the_way": return "Your order is on its way to you!";
    case "delivered": return "Delivered! Enjoy your meal.";
    case "cancelled": return "This order was cancelled.";
    default: return "";
  }
}

function estimatedTime(status: string, createdAt: string): string | null {
  if (status === "delivered" || status === "cancelled") return null;
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 1000 / 60;
  const remaining = Math.max(0, 30 - elapsed);
  if (remaining === 0) return "Arriving any moment";
  return `~${Math.ceil(remaining)} min`;
}

export default function TrackPage() {
  const [input, setInput] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function lookUp() {
    const id = input.trim();
    if (!id) { setError("Enter an order ID to track."); return; }
    setError(null);
    setOrder(null);
    setLoading(true);

    const supabase = createClient();
    const idNum = Number(id);
    let query = supabase.from("orders").select("*");
    query = Number.isInteger(idNum) ? query.eq("id", idNum) : query.eq("id", id);
    const { data, error: err } = await query.single();

    setLoading(false);
    if (err || !data) {
      setError(`No order #${id} found. Check the number and try again.`);
      return;
    }
    setOrder(data as unknown as Order);
    startPolling(String(data.id));
  }

  function startPolling(orderId: string) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (data) {
        const o = data as unknown as Order;
        setOrder(o);
        if (o.status === "delivered" || o.status === "cancelled") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }
    }, 5000);
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Tick for ETA countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const current = order ? statusStep(order.status) : 0;
  const eta = order ? estimatedTime(order.status, order.created_at) : null;

  return (
    <RequireCustomer>
      <PageShell backHref="/" backLabel="Go home" maxWidth="max-w-2xl" roleNav>
        <PageHeader
          icon={PackageSearch}
          title="Track your order"
          subtitle="Enter your order ID to see live delivery status."
        />

        <div className="card card-pad mt-8">
          <label htmlFor="track-id" className="text-sm font-semibold text-ink-800">
            Order ID
          </label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-400" />
            <input
              id="track-id"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookUp()}
              placeholder="e.g. 1001"
              className="focus-ring input-base h-12 rounded-full pl-12 pr-4"
            />
          </div>
          <Button className="mt-4 w-full" size="lg" loading={loading} onClick={lookUp}>
            Track order <ArrowRight className="size-4" />
          </Button>
          {error && (
            <p className="mt-3 text-center text-sm font-medium text-coral-500">{error}</p>
          )}
        </div>

        {/* Tracking result */}
        {order && (
          <section className="animate-fade-up card card-pad mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge tone={statusTone(order.status)} dot>
                {STATUS_LABEL[order.status] ?? order.status}
              </Badge>
              <div className="flex items-center gap-3">
                {eta && (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-primary-600">
                    <Clock className="size-4" />
                    {eta}
                  </span>
                )}
                <span className="font-mono text-xs text-ink-400">#{order.id}</span>
              </div>
            </div>
            <h2 className="mt-3 text-xl font-bold text-ink-900">{order.restaurant_name}</h2>
            <p className="mt-1 text-sm text-ink-500">
              Placed {new Date(order.created_at).toLocaleString()}
            </p>

            <p className="mt-4 rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
              {statusMessage(order.status)}
            </p>

            {/* Stepper */}
            <div className="mt-8" aria-label="Order status">
              <ol className="flex items-start">
                {STEPS.map((step, i) => {
                  const done = i < current;
                  const active = i === current;
                  const Icon = step.icon;
                  return (
                    <li key={step.label} className="flex flex-1 items-center last:flex-none">
                      <div className="flex w-14 flex-col items-center gap-1.5 text-center">
                        <span
                          className={`grid size-9 place-items-center rounded-full border-2 transition-all duration-300 ${
                            done
                              ? "border-primary-500 bg-primary-500 text-white shadow-glow"
                              : active
                                ? "border-primary-500 bg-white text-primary-600 shadow-glow animate-pulse"
                                : "border-beige-200 bg-white text-ink-400"
                          }`}
                        >
                          {done ? <Check className="size-4" strokeWidth={3} /> : active ? <Icon className="size-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                        </span>
                        <span className={`text-[10px] font-semibold leading-tight sm:text-[11px] ${done || active ? "text-primary-700" : "text-ink-400"}`}>
                          {step.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <span className={`mx-1 mb-5 h-0.5 flex-1 rounded-full transition-colors duration-500 sm:mx-2 ${done ? "bg-primary-500" : "bg-beige-200"}`} />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            {order.status !== "delivered" && order.status !== "cancelled" && (
              <p className="mt-4 flex items-center gap-1.5 text-center text-xs text-ink-400">
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-sage-500" />
                Live tracking — updates every 5 seconds
              </p>
            )}

            <div className="mt-6 flex justify-center">
              <Link href={`/orders/${order.id}`}>
                <Button variant="secondary">View full order details</Button>
              </Link>
            </div>
          </section>
        )}

        {/* Quick links to recent orders */}
        <section className="mt-8">
          <h3 className="text-sm font-semibold text-ink-700">Quick access</h3>
          <div className="mt-3 flex gap-3">
            <Link href="/orders">
              <Button variant="secondary" size="sm">
                <Clock className="size-4" /> My orders
              </Button>
            </Link>
          </div>
        </section>
      </PageShell>
    </RequireCustomer>
  );
}
