"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  User as UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageShell } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import dynamic from "next/dynamic";
const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);
import { useCart } from "@/lib/cart";
import { RequireCustomer } from "@/components/ui/RequireCustomer";

type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
};

type Review = {
  id: string;
  product_id: string;
  author: string;
  content: string;
  rating: number;
  created_at: string;
};

const AVATAR_COLORS = [
  "bg-primary-600",
  "bg-coral-500",
  "bg-sage-600",
  "bg-amber-500",
  "bg-indigo-500",
];

function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const picked = parts.length ? parts.map((p) => p[0]).slice(0, 2) : ["A"];
  return picked.join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${size} ${i < value ? "fill-primary-500 text-primary-500" : "text-beige-300"}`}
        />
      ))}
    </div>
  );
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-beige-200 bg-cream p-1 shadow-soft">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className="focus-ring grid size-9 place-items-center rounded-full text-ink-700 transition-all hover:bg-white active:scale-90 disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center text-sm font-bold tabular text-ink-900">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(9, value + 1))}
        disabled={value >= 9}
        aria-label="Increase quantity"
        className="focus-ring grid size-9 place-items-center rounded-full text-ink-700 transition-all hover:bg-white active:scale-90 disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { cart, add: addToCart, remove: removeFromCart, count: cartCount } = useCart();

  useEffect(() => {
    let active = true;
    fetch(`/api/product/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setItem(d.item ?? null);
        setReviews(d.reviews ?? []);
        const rest = (d.restaurants ?? []).find(
          (r: { id: string }) => r.id === d.item?.restaurant_id
        );
        setRestaurantName(rest?.name ?? null);
      })
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params.id]);

  const inCart = item ? cart.some((c) => c.id === item.id) : false;

  const handleAdd = useCallback(() => {
    if (!item) return;
    if (inCart) {
      removeFromCart(item.id);
    } else {
      for (let i = 0; i < qty; i++) {
        addToCart({ id: item.id, name: item.name, price: item.price });
      }
    }
  }, [item, inCart, qty, addToCart, removeFromCart]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = content.trim();
      if (!trimmed) return;
      const tempId = `temp-${Date.now()}`;
      const optimistic: Review = {
        id: tempId,
        product_id: params.id,
        author: author.trim() || "Anonymous",
        content: trimmed,
        rating,
        created_at: new Date().toISOString(),
      };
      setReviews((prev) => [optimistic, ...prev]);
      setAuthor("");
      setContent("");
      setRating(5);
      setPosting(true);
      setError(null);
      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: params.id,
            author: optimistic.author,
            content: trimmed,
            rating,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setReviews((prev) => prev.filter((r) => r.id !== tempId));
          setError(data.error ?? "Could not post review.");
          return;
        }
        setReviews((prev) => prev.map((r) => (r.id === tempId ? data.review : r)));
      } catch {
        setReviews((prev) => prev.filter((r) => r.id !== tempId));
        setError("Network error.");
      } finally {
        setPosting(false);
      }
    },
    [params.id, author, content, rating]
  );

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return null;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const distribution = useMemo(() => {
    const d = [0, 0, 0, 0, 0];
    for (const r of reviews) {
      const s = Math.min(5, Math.max(1, Math.round(r.rating)));
      d[5 - s] += 1;
    }
    return d;
  }, [reviews]);

  const maxCount = Math.max(1, ...distribution);

  const images = useMemo(
    () =>
      (item?.image_url ?? "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean),
    [item]
  );
  const heroImage = images[Math.min(activeImage, Math.max(0, images.length - 1))];

  const price = item ? Number(item.price).toFixed(2) : "0.00";
  const addLabel = inCart
    ? "Added to cart ✓"
    : qty > 1
      ? `Add ${qty} to cart`
      : "Add to cart";

  return (
    <RequireCustomer>
    <PageShell
      backHref="/menu"
      backLabel="Back to menu"
      maxWidth="max-w-5xl"
      roleNav
      right={
        <>
          <Link
            href="/cart"
            className="focus-ring relative inline-flex items-center gap-2 rounded-full border border-beige-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 shadow-soft transition-all duration-200 hover:border-primary-300 hover:text-primary-600 active:scale-95"
          >
            <ShoppingBag className="size-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-primary-600 px-1 text-[11px] font-bold text-white shadow-glow">
                {cartCount}
              </span>
            )}
          </Link>
          <UserMenu />
        </>
      }
    >
      {loading ? (
        <div className="mt-6 space-y-6">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      ) : !item ? (
        <EmptyState
          icon="🤷"
          title="Dish not found"
          description="That dish may have been removed from the menu."
          action={
            <Link href="/menu">
              <Button variant="secondary">Back to menu</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Hero */}
          <section className="animate-fade-up card mt-6 overflow-hidden lg:grid lg:grid-cols-[1.25fr_1fr]">
            <div className="relative flex min-h-64 items-center justify-center bg-gradient-to-br from-primary-100 via-beige-100 to-coral-100 lg:min-h-[22rem]">
              <span className="text-[9rem] leading-none drop-shadow-xl transition-transform duration-300 sm:text-[11rem]">
                {heroImage ?? "🍲"}
              </span>
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                  {images.map((im, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      aria-label={`Image ${i + 1}`}
                      aria-pressed={i === activeImage}
                      className={`focus-ring grid size-10 place-items-center rounded-xl border-2 bg-white text-xl transition-all ${
                        i === activeImage
                          ? "scale-110 border-primary-500 shadow-glow"
                          : "border-beige-200 opacity-70 hover:opacity-100"
                      }`}
                    >
                      {im}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {restaurantName && (
                  <Badge tone="brand">{restaurantName}</Badge>
                )}
                {item.category && <Badge tone="neutral">{item.category}</Badge>}
              </div>

              <h1 className="heading mt-4 text-4xl sm:text-5xl">{item.name}</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-500">
                {item.description}
              </p>

              <div className="mt-6 flex items-center gap-3">
                {avgRating ? (
                  <>
                    <Badge tone="brand">
                      <Star className="size-3.5 fill-primary-500 text-primary-500" />
                      {avgRating.toFixed(1)}
                    </Badge>
                    <Badge tone="neutral">
                      {reviews.length} review{reviews.length === 1 ? "" : "s"}
                    </Badge>
                  </>
                ) : (
                  <Badge tone="neutral">No reviews yet</Badge>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between gap-4 pt-7">
                <span className="text-3xl font-extrabold tracking-tight text-ink-900 tabular">
                  ₹{price}
                </span>
                <div className="hidden sm:block">
                  <QtyStepper value={qty} onChange={setQty} />
                </div>
                <Button
                  onClick={handleAdd}
                  aria-pressed={inCart}
                  className={`hidden sm:inline-flex ${inCart ? "!bg-sage-500" : ""}`}
                >
                  {inCart ? <Check className="size-4" /> : <Plus className="size-4" />}
                  {addLabel}
                </Button>
              </div>
            </div>
          </section>

          {avgRating && (
            <section className="card card-pad mt-8">
              <h2 className="text-lg font-bold text-ink-900">Rating summary</h2>
              <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <p className="text-5xl font-extrabold tracking-tight text-ink-900 tabular">
                    {avgRating.toFixed(1)}
                  </p>
                  <div className="mt-2 flex justify-center sm:justify-start">
                    <Stars value={Math.round(avgRating)} size="size-5" />
                  </div>
                  <p className="mt-1 text-sm text-ink-400">
                    {reviews.length} review{reviews.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="w-full max-w-md space-y-1.5">
                  {distribution.map((count, i) => {
                    const stars = 5 - i;
                    return (
                      <div key={stars} className="flex items-center gap-2 text-sm">
                        <span className="flex w-8 items-center gap-0.5 font-semibold text-ink-700">
                          {stars}
                          <Star className="size-3 fill-primary-500 text-primary-500" />
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-beige-100">
                          <div
                            className="h-full rounded-full bg-primary-500 transition-all duration-500"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-xs tabular text-ink-400">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="heading flex items-center gap-2 text-xl">
              <Star className="size-5 fill-primary-500 text-primary-500" />
              Reviews
            </h2>

            <form
              onSubmit={submit}
              className="card card-pad mt-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name"
                  icon={<UserIcon className="size-4" />}
                />
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="focus-ring p-1 transition-transform hover:scale-110 active:scale-95"
                      aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
                    >
                      <Star
                        className={`size-6 ${n <= (hoverRating ?? rating) ? "fill-primary-500 text-primary-500" : "text-beige-300"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                required
                placeholder="Share what you thought about this dish…"
                aria-label="Review"
                className="focus-ring mt-3 w-full rounded-2xl border border-beige-200 bg-surface-soft p-4 text-sm text-ink-900 shadow-soft placeholder:text-ink-400 transition-all duration-200 hover:border-beige-300 focus:border-primary-400 focus:bg-surface"
              />
              {error && (
                <p className="mt-2 text-sm font-medium text-coral-500" role="alert">
                  {error}
                </p>
              )}
              <div className="mt-4 flex justify-end">
                <Button type="submit" loading={posting}>
                  Post review
                </Button>
              </div>
            </form>

            <div className="mt-5 space-y-4">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="card card-hover p-5"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-soft ${avatarColor(r.author)}`}
                    >
                      {initials(r.author)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-bold text-ink-900">{r.author}</p>
                        <span className="shrink-0 text-xs text-ink-400">
                          {formatDate(r.created_at)}
                        </span>
                      </div>
                      <div className="mt-1">
                        <Stars value={r.rating} />
                      </div>
                    </div>
                  </div>
                  <div
                    className="mt-3 break-words text-sm leading-relaxed text-ink-700 [&_a]:text-primary-600"
                    dangerouslySetInnerHTML={{ __html: r.content }}
                  />
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </PageShell>

    {/* Mobile sticky add-to-cart bar */}
    {item && (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-beige-200 bg-white/95 px-4 py-3 shadow-pop backdrop-blur sm:hidden">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          <QtyStepper value={qty} onChange={setQty} />
          <span className="ml-auto text-xl font-extrabold tabular text-ink-900">
            ₹{price}
          </span>
          <Button
            onClick={handleAdd}
            aria-pressed={inCart}
            className={`shrink-0 ${inCart ? "!bg-sage-500" : ""}`}
          >
            {inCart ? <Check className="size-4" /> : <Plus className="size-4" />}
            {inCart ? "Added ✓" : "Add"}
          </Button>
        </div>
      </div>
    )}
    </RequireCustomer>
  );
}
