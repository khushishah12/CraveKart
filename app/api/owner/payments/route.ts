import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  const auth = await requireOwner(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = await createClient();

    const { data: orderRows, error: ordersErr } = await supabase
      .from("orders")
      .select("id")
      .eq("restaurant_id", auth.restaurantId);

    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
    }

    const orderIds = (orderRows ?? []).map((o) => o.id);

    if (orderIds.length === 0) {
      return NextResponse.json({ payments: [] });
    }

    const { data: payments, error: paymentsErr } = await supabase
      .from("payments")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false });

    if (paymentsErr) {
      return NextResponse.json({ error: paymentsErr.message }, { status: 500 });
    }

    return NextResponse.json({ payments });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
