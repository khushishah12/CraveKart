import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = await createClient();
    const { data: offers, error } = await supabase
      .from("offers")
      .select("*")
      .eq("restaurant_id", auth.restaurantId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ offers });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { title, description, discount_type, discount_value, min_order, max_discount, code, starts_at, expires_at, is_active } = body;

    if (!title || !discount_type || discount_value === undefined) {
      return NextResponse.json({ error: "title, discount_type, and discount_value are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: offer, error } = await supabase
      .from("offers")
      .insert({
        restaurant_id: auth.restaurantId,
        title,
        description: description ?? null,
        discount_type,
        discount_value,
        min_order: min_order ?? null,
        max_discount: max_discount ?? null,
        code: code ?? null,
        starts_at: starts_at ?? null,
        expires_at: expires_at ?? null,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ offer });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("offers")
      .select("restaurant_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
    if (existing.restaurant_id !== auth.restaurantId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data: offer, error } = await supabase
      .from("offers")
      .update(fields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ offer });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("offers")
      .select("restaurant_id")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
    if (existing.restaurant_id !== auth.restaurantId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
