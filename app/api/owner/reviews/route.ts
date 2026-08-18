import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireOwner(_request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = await createClient();

    const { data: menuItems, error: itemsErr } = await supabase
      .from("menu_items")
      .select("id")
      .eq("restaurant_id", auth.restaurantId);

    if (itemsErr || !Array.isArray(menuItems) || menuItems.length === 0) {
      return NextResponse.json({ reviews: [] });
    }

    const itemIds = menuItems.map((m) => m.id);

    const { data: reviews, error: reviewsErr } = await supabase
      .from("reviews")
      .select("*, menu_items(name, restaurant_id)")
      .in("product_id", itemIds)
      .order("created_at", { ascending: false });

    if (reviewsErr || !Array.isArray(reviews)) {
      return NextResponse.json({ reviews: [] });
    }

    const reviewIds = reviews.map((r) => r.id);

    const repliesMap = new Map<string, unknown[]>();

    if (reviewIds.length > 0) {
      const { data: replies } = await supabase
        .from("review_replies")
        .select("*")
        .in("review_id", reviewIds)
        .order("created_at", { ascending: true });

      if (Array.isArray(replies)) {
        for (const reply of replies) {
          const list = repliesMap.get(reply.review_id) || [];
          list.push(reply);
          repliesMap.set(reply.review_id, list);
        }
      }
    }

    const result = reviews.map((r) => ({
      ...r,
      replies: repliesMap.get(r.id) || [],
    }));

    return NextResponse.json({ reviews: result });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
