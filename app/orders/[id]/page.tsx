"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bike,
  Check,
  ChefHat,
  Clock,
  CreditCard,
  HandPlatter,
  Home,
  MapPin,
  PackageCheck,
  RotateCcw,
  Truck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { addItemToCart } from "@/lib/cart";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge, statusTone, STATUS_LABEL } from "@/components/ui/Badge";
import { RequireCustomer } from "@/components/ui/RequireCustomer";

type CartLine = { id?: string; name?: string; price?: number; qty?: number };
type Order = {
  id: number;
  user_id: string | null;
  restaurant_name: string;
  restaurant_id: string | null;
  items: CartLine[];
  total: number;
  status: string;
  cc_number: string | null;
  delivery_address: string | null;
  created_at: string;
};

// VULN (A01 IDOR): the order is fetched straight from the client Supabase
// client — signed in as the ANON role, with ROW LEVEL SECURITY disabled on
// public.orders. There is deliberately NO `.eq("user_id", …)` filter: pass
// any integer id (1001, 1002, …) and you read someone else's order — and
// their stored card number (A02). Integer ids are sequential and guessable.
const STEPS = [
  { label: "Placed", icon: Home },
  { label: "Preparing", icon: ChefHat },
  { label: "Ready", icon: HandPlatter },
  { label: "On the Way", icon: Bike },
  { label: "Delivered", icon: PackageCheck },
] as const;

function statusStep(status: string): number {
  switch (status) {
    case "preparing":
      return 1;
    case "ready":
      return 2;
    case "on_the_way":
      return 3;
    case "delivered":
      return 4;
    default:
      return 0;
  }
}

function statusMessage(status: string): string {
  switch (status) {
    case "pending":
      return "Your order has been placed and is waiting for the restaurant to accept.";
    case "preparing":
      return "The kitchen is preparing your food right now.";
    case "ready":
      return "Your order is ready and waiting for pickup by the delivery partner.";
    case "on_the_way":
      return "Your order is on its way to you! Hang tight.";
    case "delivered":
      return "Your order has been delivered. Enjoy your meal!";
    case "cancelled":
      return "This order has been cancelled.";
    default:
      return "";
  }
}

function estimatedTime(status: string, createdAt: string): string | null {
  if (status === "delivered" || status === "cancelled") return null;
  const base = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsed = (now - base) / 1000 / 60;
  const remaining = Math.max(0, 30 - elapsed);
  if (remaining === 0) return "Arriving any moment";
  return `~${Math.ceil(remaining)} min remaining`;
}

function foodEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("pizza")) return "🍕";
  if (n.includes("cheeseburger") || n.includes("burger")) return "🍔";
  if (n.includes("fries")) return "🍟";
  if (n.includes("shake")) return "🥤";
  if (n.includes("bread")) return "🥖";
  if (n.includes("butter chicken")) return "🍛";
  if (n.includes("paneer")) return "🧆";
  if (n.includes("naan")) return "🫓";
  if (n.includes("gulab")) return "🍮";
  if (n.includes("tiramisu")) return "🍰";
  return "🍽️";
}

function cardBrand(number: string): string {
  return /^5/.test(number) ? "Mastercard" : "Visa";
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial fetch + polling every 5 seconds while order is active
  useEffect(() => {
    let active = true;

    async function fetchOrder() {
      const supabase = createClient();
      // No user_id filter — rely solely on (absent) RLS.
      let query = supabase.from("orders").select("*");
      const idNum = Number(params.id);
      query = Number.isInteger(idNum) ? query.eq("id", idNum) : query.eq("id", params.id);
      const { data, error: err } = await query.single();
      if (!active) return;
      if (err || !data) setError(true);
      else {
        setOrder(data as unknown as Order);
        // Stop polling if terminal state
        const s = (data as Record<string, string>).status;
        if (s === "delivered" || s === "cancelled") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }
      setLoading(false);
    }

    fetchOrder();
    intervalRef.current = setInterval(fetchOrder, 5000);

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [params.id]);

  // Tick every second for the ETA countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const current = order ? statusStep(order.status) : 0;
  const subtotal = (order?.items ?? []).reduce(
    (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );
  const eta = order ? estimatedTime(order.status, order.created_at) : null;

  function orderAgain() {
    if (!order) return;
    for (const line of order.items ?? []) {
      if (line.name) {
        addItemToCart({
          id: line.id ?? line.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          name: line.name,
          price: line.price ?? 0,
          restaurant_id: order.restaurant_id ?? undefined,
          restaurant_name: order.restaurant_name,
        });
      }
    }
    router.push("/cart");
  }

  return (
    <RequireCustomer>
      <PageShell backHref="/orders" backLabel="Back to orders" maxWidth="max-w-2xl" roleNav>
        {loading ? (
          <Skeleton className="mt-8 h-[420px] rounded-3xl" />
        ) : error || !order ? (
          <EmptyState
            icon="🤷"
            title="Order not found"
            description={`We couldn't find order #${params.id}.`}
            action={
              <Link href="/orders">
                <Button variant="secondary">Back to orders</Button>
              </Link>
            }
          />
        ) : (
          <>
            <section className="animate-fade-up card card-pad mt-8">
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
                  <span className="font-mono text-xs text-ink-400">
                    Order #{order.id}
                  </span>
                </div>
              </div>
              <h1 className="heading mt-4 text-2xl sm:text-3xl">
                {order.restaurant_name}
              </h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-500">
                <Clock className="size-4" />
                Placed {new Date(order.created_at).toLocaleString()}
              </p>

              {/* Status message */}
              <p className="mt-4 rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
                {statusMessage(order.status)}
              </p>

              {/* Progress stepper */}
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
                            {done ? (
                              <Check className="size-4" strokeWidth={3} />
                            ) : active ? (
                              <Icon className="size-4" />
                            ) : (
                              <span className="text-xs font-bold">{i + 1}</span>
                            )}
                          </span>
                          <span
                            className={`text-[10px] font-semibold leading-tight sm:text-[11px] ${
                              done || active ? "text-primary-700" : "text-ink-400"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <span
                            className={`mx-1 mb-5 h-0.5 flex-1 rounded-full transition-colors duration-500 sm:mx-2 ${
                              done ? "bg-primary-500" : "bg-beige-200"
                            }`}
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Auto-refresh indicator */}
              {order.status !== "delivered" && order.status !== "cancelled" && (
                <p className="mt-4 flex items-center gap-1.5 text-center text-xs text-ink-400">
                  <span className="inline-block size-1.5 animate-pulse rounded-full bg-sage-500" />
                  Live tracking — updates every 5 seconds
                </p>
              )}
            </section>

            <section className="card card-pad mt-5">
              <h2 className="flex items-center gap-2 font-bold text-ink-900">
                <Truck className="size-5 text-primary-600" />
                Items
              </h2>
              <ul className="mt-4 divide-y divide-beige-100">
                {(order.items ?? []).map((line, i) => (
                  <li key={i} className="flex items-center gap-4 py-3.5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-beige-100 to-primary-50 text-2xl">
                      {foodEmoji(line.name ?? "")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">
                        {line.name ?? "Item"}
                      </p>
                      <p className="text-sm text-ink-400">× {line.qty ?? 1}</p>
                    </div>
                    <span className="shrink-0 font-bold tabular text-ink-900">
                      ₹{((line.price ?? 0) * (line.qty ?? 1)).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card card-pad mt-5 flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-beige-100 text-primary-600">
                <MapPin className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">Delivery address</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-500">
                  {order.delivery_address ?? "Address on file for this order."}
                </p>
              </div>
            </section>

            <section className="card card-pad mt-5">
              <h2 className="flex items-center gap-2 font-bold text-ink-900">
                <CreditCard className="size-5 text-primary-600" />
                Payment
              </h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-ink-500">
                  <span>Subtotal</span>
                  <span className="tabular text-ink-700">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-500">
                  <span>Delivery fee</span>
                  <span className="font-semibold text-sage-500">Free</span>
                </div>
                <div className="flex justify-between border-t border-beige-100 pt-3 text-lg font-extrabold text-ink-900">
                  <span>Total</span>
                  <span className="tabular">₹{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
                <span className="text-sm font-semibold text-ink-700">
                  {order.cc_number ? cardBrand(order.cc_number) : "Card"} ending in{" "}
                  <span className="tabular">{order.cc_number?.slice(-4) ?? "—"}</span>
                </span>
                <span className="font-mono text-base font-extrabold tracking-widest tabular text-ink-900">
                  {order.cc_number ?? "—"}
                </span>
              </div>
            </section>

            <p className="mt-3 text-center text-xs text-ink-400">
              No login required to view this — the full card number is stored in
              plaintext (A02) and readable by anyone who guesses the id (IDOR / A01).
            </p>

            <div className="mt-6 text-center">
              <Button onClick={orderAgain}>
                <RotateCcw className="size-4" />
                Order again
              </Button>
            </div>
          </>
        )}
      </PageShell>
    </RequireCustomer>
  );
}
