import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = await createClient();

    const { count: totalOrders, error: ordersCountErr } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", auth.restaurantId);

    if (ordersCountErr) {
      return NextResponse.json({ error: ordersCountErr.message }, { status: 500 });
    }

    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, status, total, items, created_at")
      .eq("restaurant_id", auth.restaurantId);

    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
    }

    const orderRows = orders ?? [];

    let totalRevenue = 0;
    let pendingOrders = 0;
    const ordersByStatus: Record<string, number> = {};
    const itemCounts: Record<string, number> = {};
    const dailyRevenueMap: Record<string, number> = {};

    for (const order of orderRows) {
      totalRevenue += Number(order.total) || 0;

      if (order.status === "pending") pendingOrders += 1;

      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;

      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const name = item.name ?? item.title ?? "Unknown";
          itemCounts[name] = (itemCounts[name] || 0) + (item.quantity ?? 1);
        }
      }

      if (order.created_at) {
        const dateKey = order.created_at.slice(0, 10);
        dailyRevenueMap[dateKey] = (dailyRevenueMap[dateKey] || 0) + (Number(order.total) || 0);
      }
    }

    const topItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const dailyRevenue = Object.entries(dailyRevenueMap)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);

    const { data: menuItems, error: menuErr } = await supabase
      .from("menu_items")
      .select("id")
      .eq("restaurant_id", auth.restaurantId);

    if (menuErr) {
      return NextResponse.json({ error: menuErr.message }, { status: 500 });
    }

    const totalMenuItems = (menuItems ?? []).length;

    let totalReviews = 0;
    let averageRating = 0;

    if (menuItems && menuItems.length > 0) {
      const itemIds = menuItems.map((m) => m.id);

      const { data: reviews, error: reviewsErr } = await supabase
        .from("reviews")
        .select("rating")
        .in("product_id", itemIds);

      if (reviewsErr) {
        return NextResponse.json({ error: reviewsErr.message }, { status: 500 });
      }

      const reviewRows = reviews ?? [];
      totalReviews = reviewRows.length;

      if (totalReviews > 0) {
        const sum = reviewRows.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        averageRating = Math.round((sum / totalReviews) * 100) / 100;
      }
    }

    return NextResponse.json({
      totalOrders: totalOrders ?? 0,
      totalRevenue,
      pendingOrders,
      averageRating,
      totalMenuItems,
      totalReviews,
      ordersByStatus,
      dailyRevenue,
      topItems,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
