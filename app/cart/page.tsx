"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { CreditCard, MapPin, Minus, Plus, ShoppingBag, Sparkles, Tag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import dynamic from "next/dynamic";
const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);
import { useCart } from "@/lib/cart";
import { useCurrentUser } from "@/lib/auth";
import { RequireCustomer } from "@/components/ui/RequireCustomer";

// Controlled field that pre-fills from the signed-in profile's saved address.
// It is keyed by profile id in the page so it remounts (and re-seeds) when the
// user changes after hydration — avoiding a setState-in-effect.
function DeliveryAddressField({
  initial,
  onChange,
}: {
  initial: string;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Input
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onChange(e.target.value);
      }}
      placeholder="Home, Apt 4, MG Road, Bengaluru"
      icon={<MapPin className="size-[18px]" />}
    />
  );
}

export default function CartPage() {
  const router = useRouter();
  const profile = useCurrentUser();
  const { cart, updateQty, clear, ready } = useCart();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart]);
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = useCallback(async () => {
    setCouponMsg(null);
    try {
      const r = await fetch(`/api/coupon?code=${encodeURIComponent(coupon)}`);
      const d = await r.json();
      setDiscount(Number(d.discount) || 0);
      setCouponMsg(
        d.discount > 0
          ? `Coupon applied: ₹${d.discount} off`
          : `No discount for "${coupon}".`
      );
    } catch {
      setCouponMsg("Coupon lookup failed.");
    }
  }, [coupon]);

  const placeOrder = useCallback(async () => {
    setError(null);
    if (!address.trim()) {
      setError("Please enter a delivery address.");
      return;
    }
    if (!/^\d{13,16}$/.test(cardNumber.replace(/\s/g, ""))) {
      setError("Card number must be 13–16 digits.");
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          card: { name: cardName, number: cardNumber, expiry, cvv },
          delivery_address: address,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed.");
        return;
      }
      clear();
      router.push(`/orders/${data.order.id}`);
    } catch {
      setError("Network error.");
    } finally {
      setPlacing(false);
    }
  }, [cart, cardName, cardNumber, expiry, cvv, address, clear, router]);

  return (
    <RequireCustomer>
    <PageShell
      backHref="/menu"
      backLabel="Back to menu"
      maxWidth="max-w-5xl"
      right={<UserMenu />}
      roleNav
    >
      <PageHeader
        icon={ShoppingBag}
        title="Your cart"
        subtitle={
          cart.length > 0
            ? `${cart.length} item${cart.length === 1 ? "" : "s"} ready to check out`
            : "Nothing here yet — let's fix that."
        }
      />

      {!ready ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : cart.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          description="Head back to the menu and pick something tasty."
          action={
            <Link href="/menu">
              <Button>Browse menu</Button>
            </Link>
          }
        />
      ) : (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Cart lines */}
          <section className="space-y-4">
            {cart.map((line) => (
              <article
                key={line.id}
                className="card card-hover flex items-center gap-4 p-4"
              >
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-beige-100 to-primary-50 text-3xl">
                  🍽️
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink-900">{line.name}</p>
                  <p className="mt-0.5 text-sm text-ink-500 tabular">
                    ₹{line.price.toFixed(2)} each
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-beige-200 bg-cream p-1">
                  <button
                    onClick={() => updateQty(line.id, -1)}
                    className="focus-ring grid size-8 place-items-center rounded-full text-ink-700 transition-all hover:bg-white active:scale-90"
                    aria-label={`Decrease quantity of ${line.name}`}
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold tabular text-ink-900">
                    {line.qty}
                  </span>
                  <button
                    onClick={() => updateQty(line.id, 1)}
                    className="focus-ring grid size-8 place-items-center rounded-full text-ink-700 transition-all hover:bg-white active:scale-90"
                    aria-label={`Increase quantity of ${line.name}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <span className="w-20 text-right text-base font-extrabold tabular text-ink-900">
                  ₹{(line.price * line.qty).toFixed(2)}
                </span>
                <button
                  onClick={() => updateQty(line.id, -line.qty)}
                  className="focus-ring grid size-9 shrink-0 place-items-center rounded-full text-coral-500 transition-colors hover:bg-coral-400/10 active:scale-90"
                  aria-label={`Remove ${line.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </article>
            ))}
            <div className="flex justify-end">
              <button
                onClick={clear}
                className="focus-ring rounded-full px-4 py-2 text-sm font-semibold text-ink-500 transition-colors hover:text-coral-500"
              >
                Clear cart
              </button>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            <section className="card card-pad">
              <h2 className="flex items-center gap-2 font-bold text-ink-900">
                <Tag className="size-5 text-primary-600" />
                Coupon
              </h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="e.g. FRESH10"
                  aria-label="Coupon code"
                  className="input-base min-w-0 flex-1 rounded-full"
                />
                <Button variant="dark" onClick={applyCoupon}>
                  Apply
                </Button>
              </div>
              {couponMsg && (
                <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-sage-500">
                  <Sparkles className="size-3.5" />
                  {couponMsg}
                </p>
              )}
            </section>

            <section className="card card-pad">
              <h2 className="flex items-center gap-2 font-bold text-ink-900">
                <MapPin className="size-5 text-primary-600" />
                Delivery
              </h2>
              <div className="mt-3">
                <Field label="Delivery address" htmlFor="deliveryAddress">
                  <DeliveryAddressField
                    key={profile?.id ?? "guest"}
                    initial={profile?.delivery_address ?? ""}
                    onChange={setAddress}
                  />
                </Field>
              </div>
            </section>

            <section className="card card-pad">
              <h2 className="flex items-center gap-2 font-bold text-ink-900">
                <CreditCard className="size-5 text-primary-600" />
                Payment
              </h2>
              <div className="mt-4 space-y-3">
                <Field label="Name on card" htmlFor="cardName">
                  <Input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Ava Admin" />
                </Field>
                <Field label="Card number" htmlFor="cardNumber">
                  <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4111 1111 1111 1111" inputMode="numeric" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiry" htmlFor="expiry">
                    <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" />
                  </Field>
                  <Field label="CVV" htmlFor="cvv">
                    <Input value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="123" inputMode="numeric" />
                  </Field>
                </div>
              </div>
              {error && (
                <p className="mt-3 rounded-xl border border-coral-500/25 bg-coral-400/10 px-4 py-2.5 text-sm font-medium text-coral-500" role="alert">
                  {error}
                </p>
              )}
            </section>

            <section className="card card-pad">
              <div className="flex justify-between text-sm text-ink-500">
                <span>Subtotal</span>
                <span className="font-semibold text-ink-900 tabular">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-2.5 flex justify-between text-sm text-ink-500">
                <span>Coupon</span>
                <span className="font-semibold text-sage-500 tabular">− ₹{discount.toFixed(2)}</span>
              </div>
              <div className="mt-4 flex justify-between border-t border-dashed border-beige-200 pt-4 text-lg font-extrabold text-ink-900">
                <span>Total</span>
                <span className="tabular">₹{total.toFixed(2)}</span>
              </div>
              <Button className="mt-5 w-full" size="lg" loading={placing} onClick={placeOrder}>
                Place order · ₹{total.toFixed(2)}
              </Button>
              <p className="mt-3 text-center text-xs text-ink-400">
                Ordering takes seconds — your food will be on its way.
              </p>
            </section>
          </aside>
        </div>
      )}
    </PageShell>
    </RequireCustomer>
  );
}
