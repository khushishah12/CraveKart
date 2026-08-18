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

type FoodCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
};

export async function GET(_request: NextRequest) {
  const auth = await requireOwner(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = await createClient();
    const [itemsRes, catsRes] = await Promise.all([
      supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", auth.restaurantId)
        .order("sort_order"),
      supabase
        .from("food_categories")
        .select("*")
        .eq("restaurant_id", auth.restaurantId)
        .order("sort_order"),
    ]);

    if (itemsRes.error) {
      return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
    }
    if (catsRes.error) {
      return NextResponse.json({ error: catsRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: (itemsRes.data ?? []) as MenuItem[],
      categories: (catsRes.data ?? []) as FoodCategory[],
    });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      price: number;
      category?: string;
      image_url?: string;
      available?: boolean;
    };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        restaurant_id: auth.restaurantId,
        name: body.name,
        description: body.description ?? null,
        price: body.price,
        category: body.category ?? null,
        image_url: body.image_url ?? null,
        available: body.available ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data as MenuItem }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
