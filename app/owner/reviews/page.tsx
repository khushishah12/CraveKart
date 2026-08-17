"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, Star, Send } from "lucide-react";

import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { OwnerNav } from "@/components/ui/OwnerNav";
import { useIsRestaurantOwner } from "@/lib/auth";
import dynamic from "next/dynamic";

const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

type ReviewReply = {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
};

type Review = {
  id: string;
  author_name: string;
  rating: number;
  content: string;
  created_at: string;
  menu_item_name: string | null;
  replies: ReviewReply[];
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-ink-300"}`}
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const isOwner = useIsRestaurantOwner();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/owner/reviews")
      .then((r) => r.json())
      .then((d) => active && setReviews(d.reviews ?? []))
      .catch(() => null)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function submitReply(reviewId: string) {
    if (!replyText.trim()) return;
    setSubmittingId(reviewId);
    try {
      const r = await fetch(`/api/owner/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      if (r.ok) {
        const d = await r.json();
        setReviews((prev) =>
          prev.map((rev) =>
            rev.id === reviewId
              ? { ...rev, replies: [...rev.replies, d.reply] }
              : rev
          )
        );
        setReplyText("");
        setReplyingTo(null);
      }
    } catch {
      // ignore
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <PageShell backHref="/" backLabel="Go home" right={<UserMenu />} maxWidth="max-w-6xl">
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
            icon={MessageSquareText}
            title="Reviews"
            subtitle="See what your customers are saying and reply to their feedback."
          />
          <OwnerNav />

          {loading ? (
            <div className="mt-8 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card h-32 animate-pulse" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <EmptyState
              icon={<MessageSquareText className="size-10 text-ink-300" />}
              title="No reviews yet."
              description="When customers leave reviews, they'll show up here."
            />
          ) : (
            <div className="mt-8 space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="card card-pad animate-fade-up">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-ink-900">{review.author_name}</p>
                        <Stars rating={review.rating} />
                      </div>
                      {review.menu_item_name && (
                        <p className="mt-0.5 text-xs text-ink-400">
                          on <span className="font-medium text-ink-600">{review.menu_item_name}</span>
                        </p>
                      )}
                      <p className="mt-2 text-sm leading-relaxed text-ink-700">
                        {review.content}
                      </p>
                      <p className="mt-2 text-xs text-ink-400">
                        {new Date(review.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {review.replies && review.replies.length > 0 && (
                    <div className="mt-4 space-y-3 border-t border-beige-100 pt-4">
                      {review.replies.map((reply) => (
                        <div key={reply.id} className="rounded-xl bg-beige-100/60 px-4 py-3">
                          <p className="text-xs font-semibold text-ink-700">{reply.author_name}</p>
                          <p className="mt-1 text-sm text-ink-600">{reply.content}</p>
                          <p className="mt-1 text-[11px] text-ink-400">
                            {new Date(reply.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 border-t border-beige-100 pt-3">
                    {replyingTo === review.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="focus-ring w-full rounded-xl border border-beige-200 bg-surface-soft px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400"
                          placeholder="Write your reply..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            loading={submittingId === review.id}
                            onClick={() => submitReply(review.id)}
                          >
                            <Send className="size-3.5" /> Submit Reply
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyingTo(review.id)}
                      >
                        <Send className="size-3.5" /> Reply
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
