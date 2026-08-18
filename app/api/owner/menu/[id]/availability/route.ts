import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createClient } from "@/lib/supabase/server";

type MenuItem = {
  id: string;
  restaurant_id: string | null;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  available: boolean;
  sort_order: number;
};

type Params = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as { available: boolean };

    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("menu_items")
      .select("restaurant_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Menu item not found." }, { status: 404 });
    }

    if (existing.restaurant_id !== auth.restaurantId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("menu_items")
      .update({ available: body.available })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data as MenuItem });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
