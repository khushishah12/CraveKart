import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type OwnerAuth =
  | { ok: true; userId: string; restaurantId: string }
  | { ok: false; error: string; status: number };

async function verifyBearerToken(
  token: string
): Promise<{ id: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.id ? data : null;
}

/**
 * Verify the current session belongs to a restaurant_owner and resolve their
 * restaurant ID. Every /api/owner/* route must call this first.
 *
 * Tries the Supabase session cookie first.  If that fails (or returns a
 * non-owner profile), falls back to the Authorization: Bearer header sent by
 * the browser (ownerFetch helper).
 */
export async function requireOwner(request?: NextRequest): Promise<OwnerAuth> {
  // ── 1. Resolve Bearer user (may be null) ──────────────────────────────
  let bearerUser: { id: string } | null = null;
  const authHeader = request?.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && authHeader.length > 20) {
    bearerUser = await verifyBearerToken(authHeader.slice(7));
  }

  // ── 2. Try cookie auth ────────────────────────────────────────────────
  let supabase = await createClient();
  let {
    data: { user: cookieUser },
    error: cookieErr,
  } = await supabase.auth.getUser();

  // Start with whichever identity we have; prefer cookie if both exist.
  let user = cookieErr || !cookieUser ? bearerUser : cookieUser;

  if (!user) {
    return { ok: false, error: "Not authenticated.", status: 401 };
  }

  // ── 3. Check profile role ─────────────────────────────────────────────
  supabase = await createClient();
  let { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // If cookie auth returned a non-owner but we have a Bearer identity
  // that's different, swap to it and re-check.
  if ((!profile || profile.role !== "restaurant_owner") && bearerUser && bearerUser.id !== user.id) {
    user = bearerUser;
    supabase = await createClient();
    const result = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    profile = result.data;
  }

  if (!profile) {
    return { ok: false, error: "Profile not found.", status: 404 };
  }

  if (profile.role !== "restaurant_owner") {
    return { ok: false, error: "Forbidden.", status: 403 };
  }

  // ── 4. Resolve restaurant ─────────────────────────────────────────────
  supabase = await createClient();
  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (restErr || !restaurant) {
    return {
      ok: false,
      error: "No restaurant linked to this account.",
      status: 404,
    };
  }

  return { ok: true, userId: user.id, restaurantId: restaurant.id };
}
