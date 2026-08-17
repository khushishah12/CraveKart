import { NextResponse } from "next/server";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
    "User-Agent": "foodrush-server/1.0",
  };

  // VULN: no auth — anyone can cancel any order by guessing the ID.
  // Only pending/preparing orders can be cancelled (business rule).
  const fetchRes = await fetch(
    `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=status`,
    { headers }
  );
  const rows = await fetchRes.json().catch(() => []);
  const order = Array.isArray(rows) ? rows[0] : null;

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.status !== "pending" && order.status !== "preparing") {
    return NextResponse.json(
      { error: "Only pending or preparing orders can be cancelled." },
      { status: 400 }
    );
  }

  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "cancelled" }),
    }
  );

  if (!updateRes.ok) {
    return NextResponse.json({ error: "Failed to cancel order." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "cancelled" });
}
