import { createClient } from "@/lib/supabase/server";

export type OwnerAuth =
  | { ok: true; userId: string; restaurantId: string }
  | { ok: false; error: string; status: number };

/**
 * Verify the current session belongs to a restaurant_owner and resolve their
 * restaurant ID. Every /api/owner/* route must call this first.
 *
 * Server-side only — relies on the Supabase session cookie.
 */
export async function requireOwner(): Promise<OwnerAuth> {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { ok: false, error: "Not authenticated.", status: 401 };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("role, restaurant_id")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    return { ok: false, error: "Profile not found.", status: 404 };
  }

  if (profile.role !== "restaurant_owner") {
    return { ok: false, error: "Forbidden.", status: 403 };
  }

  if (!profile.restaurant_id) {
    return { ok: false, error: "No restaurant linked to this account.", status: 404 };
  }

  return { ok: true, userId: user.id, restaurantId: profile.restaurant_id };
}
