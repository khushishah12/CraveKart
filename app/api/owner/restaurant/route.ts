import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/owner-auth";
import { createClient } from "@/lib/supabase/server";

type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  eta_min: string;
  image_url: string | null;
  banner_url: string | null;
  owner_id: string | null;
  address: string | null;
  hours: unknown;
  contact_phone: string | null;
  contact_email: string | null;
  description: string | null;
  is_open: boolean;
};

export async function GET(_request: NextRequest) {
  const auth = await requireOwner(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", auth.restaurantId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ restaurant: data as Restaurant });
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
    const body = (await request.json()) as Partial<
      Pick<Restaurant, "name" | "cuisine" | "address" | "hours" | "contact_phone" | "contact_email" | "description" | "is_open" | "image_url" | "banner_url">
    >;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .update(body)
      .eq("id", auth.restaurantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ restaurant: data as Restaurant });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
