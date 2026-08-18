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
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOwner(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { ids } = body as { ids?: string[] };

    const supabase = await createClient();

    let query = supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", auth.userId);

    if (ids && ids.length > 0) {
      query = query.in("id", ids);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
