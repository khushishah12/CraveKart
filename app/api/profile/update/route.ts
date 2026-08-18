import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// VULN (CSRF): this endpoint authenticates ONLY via the Supabase session
// cookie (read server-side with @supabase/ssr). There is:
//   - NO CSRF token,
//   - NO Origin/Referer header check,
//   - NO explicit SameSite setting here — and the session cookie is written
//     with SameSite=None (see lib/supabase/client.ts).
// So a malicious external page can auto-submit a form, or do
//   fetch("https://cravekart.app/api/profile/update", { method: "POST",
//     credentials: "include", body: JSON.stringify({ name: "Hacked", ... }) })
// and the victim's session cookie rides along, silently editing their profile.
async function resolveUser(request: NextRequest) {
  const supabase = await createClient();
  let { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ") && authHeader.length > 20) {
      const token = authHeader.slice(7);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && anonKey) {
        const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
        });
        if (res.ok) {
          const userData = await res.json();
          if (userData?.id) user = userData;
        }
      }
    }
  }

  return user;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    phone?: unknown;
    delivery_address?: unknown;
    restaurant_name?: unknown;
  };

  const user = await resolveUser(request);

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // "Role" is deliberately not accepted here (it's already client-trusted
  // elsewhere). Only the profile fields the /profile page edits.
  const updates: Record<string, string | null> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body.phone === "string") {
    updates.phone = body.phone.trim() || null;
  }
  if (typeof body.delivery_address === "string") {
    updates.delivery_address = body.delivery_address.trim() || null;
  }

  if (Object.keys(updates).length === 0 && typeof body.restaurant_name !== "string") {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  // RLS is off, so the anon-keyed session can write to profiles.
  let profileData: Record<string, unknown> | null = null;
  if (Object.keys(updates).length > 0) {
    const { data, error } = await createClient()
      .then((c) =>
        c
          .from("users")
          .update(updates)
          .eq("id", user.id)
          .select("id,name,email,role,phone,delivery_address")
          .single()
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    profileData = data;
  } else {
    const { data } = await createClient().then((c) =>
      c.from("users").select("id,name,email,role,phone,delivery_address").eq("id", user.id).single()
    );
    profileData = data;
  }

  // If a restaurant name was provided and the user is a restaurant_owner,
  // create or update the linked restaurant.
  let restaurantInfo: { id: string; name: string } | null = null;
  if (typeof body.restaurant_name === "string" && body.restaurant_name.trim()) {
    const restName = body.restaurant_name.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && anonKey) {
      const headers = {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      };

      // Check if a restaurant is already linked to this owner.
      const existing = await fetch(
        `${supabaseUrl}/rest/v1/restaurants?owner_id=eq.${user.id}&select=id,name`,
        { headers }
      ).then((r) => r.json().catch(() => []));

      if (Array.isArray(existing) && existing.length > 0) {
        // Update the existing restaurant name.
        const restId = existing[0].id;
        const updated = await fetch(
          `${supabaseUrl}/rest/v1/restaurants?id=eq.${restId}`,
          { method: "PATCH", headers, body: JSON.stringify({ name: restName }) }
        ).then((r) => r.json().catch(() => null));
        const row = Array.isArray(updated) ? updated[0] : updated;
        restaurantInfo = { id: restId, name: row?.name ?? restName };
      } else {
        // Create a new restaurant linked to this owner.
        const created = await fetch(`${supabaseUrl}/rest/v1/restaurants`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: restName,
            owner_id: user.id,
            cuisine: "General",
            rating: 4.0,
            eta_min: "30",
          }),
        }).then((r) => r.json().catch(() => null));
        const row = Array.isArray(created) ? created[0] : created;
        if (row?.id) {
          restaurantInfo = { id: row.id, name: row.name };
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    profile: profileData,
    restaurant: restaurantInfo,
  });
}
