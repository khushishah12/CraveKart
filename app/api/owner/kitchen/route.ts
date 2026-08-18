import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = ["preparing", "ready", "on_the_way", "delivered", "cancelled"];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOwner(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json().catch(() => ({}))) as { orderId?: number; status?: string };
    const { orderId, status } = body;

    if (!orderId || !status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid request. Must provide orderId and status (one of: ${VALID_STATUSES.join(", ")})` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.restaurant_id !== auth.restaurantId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select("*")
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
    }

    if (status === "ready" && order.user_id) {
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Order Ready",
        message: `Your order #${order.id} is ready for pickup!`,
        type: "order",
        link: `/orders/${order.id}`,
      });
    }

    if (status === "on_the_way" && order.user_id) {
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "Order On The Way",
        message: `Your order #${order.id} is on its way to you!`,
        type: "order",
        link: `/orders/${order.id}`,
      });
    }

    return NextResponse.json({ order: updated });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireOwner(_request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = await createClient();

    const { data: activeOrders, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", auth.restaurantId)
      .in("status", ["pending", "preparing", "ready"])
      .order("created_at", { ascending: true });

    if (ordersErr) {
      return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
    }

    const orders = Array.isArray(activeOrders) ? activeOrders : [];
    const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))] as string[];

    let usersMap = new Map<string, { email: string | null; name: string | null }>();

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, email, name")
        .in("id", userIds);

      if (Array.isArray(users)) {
        usersMap = new Map(
          users.map((u: { id: string; email: string | null; name: string | null }) => [
            u.id,
            { email: u.email, name: u.name },
          ])
        );
      }
    }

    const result = orders.map((o) => {
      const user = o.user_id ? usersMap.get(o.user_id) : null;
      return {
        id: o.id,
        user_id: o.user_id ?? null,
        customer_email: user?.email ?? null,
        customer_name: user?.name ?? null,
        restaurant_name: o.restaurant_name,
        items: o.items,
        total: o.total,
        status: o.status,
        cc_number: o.cc_number ?? null,
        delivery_address: o.delivery_address ?? null,
        created_at: o.created_at,
        restaurant_id: o.restaurant_id ?? null,
      };
    });

    return NextResponse.json({ orders: result });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
