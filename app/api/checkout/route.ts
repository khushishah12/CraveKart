import { NextResponse } from "next/server";

type CartItem = { id?: string; name?: string; price?: number; qty?: number; restaurant_id?: string; restaurant_name?: string };
type CheckoutBody = {
  items?: CartItem[];
  card?: { number?: string; expiry?: string; cvv?: string; name?: string };
  email?: string;
  delivery_address?: string;
  user_id?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CheckoutBody;
  const { items = [], card = {}, delivery_address, user_id } = body;

  const address = String(delivery_address ?? "").trim();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  if (items.length === 0 || !card.number) {
    return NextResponse.json({ error: "Cart and card number are required." }, { status: 400 });
  }

  if (!address) {
    return NextResponse.json({ error: "A delivery address is required." }, { status: 400 });
  }

  // VULN (A02): the full card number is stored in plaintext in the orders
  // table. RLS is off, so anyone with the anon key can later read it via
  // the REST API.
  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

  // VULN (business logic): the total is trusted from the client. A crafted
  // request can set prices/qty to anything (e.g. 0.01) and checkout anyway.
  // The restaurant info is derived from the cart items (client-trusted).
  const firstItem = items[0] as CartItem;
  const order = {
    user_id: user_id || null,
    restaurant_name: firstItem?.restaurant_name || "Order Summary",
    restaurant_id: firstItem?.restaurant_id || null,
    items,
    total,
    status: "pending",
    cc_number: String(card.number),
    delivery_address: address,
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      "User-Agent": "foodrush-server/1.0",
    },
    body: JSON.stringify(order),
  });

  const data = await res.json().catch(() => null);

  if (res.status !== 201) {
    return NextResponse.json(
      { error: (data as { message?: string })?.message ?? "Checkout failed." },
      { status: 400 }
    );
  }

  const created = Array.isArray(data) ? data[0] : data;

  // VULN (A02): a payment record is stored too — with the FULL card number
  // in plaintext — in the payments table (RLS is off, so it's readable by
  // anyone with the anon key from the /admin dashboard or the browser console).
  if (created?.id) {
    fetch(`${supabaseUrl}/rest/v1/payments`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        "User-Agent": "foodrush-server/1.0",
      },
      body: JSON.stringify({
        order_id: created.id,
        amount: total,
        card_brand: /^5/.test(String(card.number)) ? "Mastercard" : "Visa",
        card_last4: String(card.number).slice(-4),
        cc_number: String(card.number),
        status: "succeeded",
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ order: created });
}
