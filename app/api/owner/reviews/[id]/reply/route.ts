import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export async function POST(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const auth = await requireOwner();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json().catch(() => ({}))) as { content?: string };
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "content is required." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: review, error: reviewErr } = await supabase
      .from("reviews")
      .select("*, menu_items(restaurant_id)")
      .eq("id", id)
      .single();

    if (reviewErr || !review) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const restaurantId =
      review.menu_items && typeof review.menu_items === "object"
        ? (review.menu_items as { restaurant_id?: string }).restaurant_id
        : null;

    if (restaurantId !== auth.restaurantId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data: reply, error: replyErr } = await supabase
      .from("review_replies")
      .insert({
        review_id: id,
        owner_id: auth.userId,
        content: content.trim(),
      })
      .select("*")
      .single();

    if (replyErr || !reply) {
      return NextResponse.json({ error: "Failed to post reply." }, { status: 500 });
    }

    if (review.user_id) {
      await supabase.from("notifications").insert({
        user_id: review.user_id,
        title: "Owner replied",
        message: `The owner replied to your review: "${content.trim().slice(0, 80)}"`,
        type: "review",
      });
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
