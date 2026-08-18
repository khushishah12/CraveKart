import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createClient } from "@/lib/supabase/server";

type Order = {
  id: number;
  user_id: string | null;
  restaurant_name: string;
  items: unknown;
  total: number;
  status: string;
  cc_number: string | null;
  delivery_address: string | null;
  created_at: string;
  restaurant_id: string | null;
};

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireOwner(_request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = await createClient();

    const { data: restaurantOrders } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", auth.restaurantId)
      .order("created_at", { ascending: false });

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", auth.restaurantId)
      .single();

    const { data: nameFallbackOrders } = await supabase
      .from("orders")
      .select("*")
      .is("restaurant_id", null)
      .eq("restaurant_name", restaurant?.name ?? "");

    const allOrders: Order[] = [
      ...(Array.isArray(restaurantOrders) ? restaurantOrders : []),
      ...(Array.isArray(nameFallbackOrders) ? nameFallbackOrders : []),
    ];

    const userIds = [...new Set(allOrders.map((o) => o.user_id).filter(Boolean))] as string[];

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

    const orders = allOrders.map((o) => {
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

    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
