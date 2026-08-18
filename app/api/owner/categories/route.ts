import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createClient } from "@/lib/supabase/server";

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
    const { data, error } = await supabase
      .from("food_categories")
      .select("*")
      .eq("restaurant_id", auth.restaurantId)
      .order("sort_order");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: (data ?? []) as FoodCategory[] });
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
    const body = (await request.json()) as { name: string; sort_order?: number };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("food_categories")
      .insert({
        restaurant_id: auth.restaurantId,
        name: body.name,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category: data as FoodCategory }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as { id: string; name?: string; sort_order?: number };

    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("food_categories")
      .select("restaurant_id")
      .eq("id", body.id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    if (existing.restaurant_id !== auth.restaurantId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("food_categories")
      .update({ name: body.name, sort_order: body.sort_order })
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category: data as FoodCategory });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as { id: string };

    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("food_categories")
      .select("restaurant_id")
      .eq("id", body.id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    if (existing.restaurant_id !== auth.restaurantId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error } = await supabase
      .from("food_categories")
      .delete()
      .eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
