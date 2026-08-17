// Recreates the demo auth users via the Supabase Admin API so their rows are
// guaranteed-valid (raw SQL inserts into auth.users can leave GoTrue unable to
// authenticate them). Requires .env.local (run with node --env-file=.env.local).
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const demoUsers = [
  { email: "admin@cravekart.app", password: "admin123", name: "Ava Admin" },
  { email: "priya@cravekart.app", password: "priya123", name: "Priya Sharma" },
  { email: "alex@cravekart.app", password: "alex123", name: "Alex Rivera" },
  { email: "owner@cravekart.app", password: "owner123", name: "Riya Patel" },
];

const { data: listed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

for (const u of listed.users) {
  if (u.email?.endsWith("@foodrush.app")) {
    await supabase.auth.admin.deleteUser(u.id);
  }
}

for (const u of demoUsers) {
  const existing = listed.users.find((x) => x.email === u.email);
  if (existing) {
    await supabase.auth.admin.deleteUser(existing.id);
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { name: u.name },
  });
  if (error) {
    console.error("FAIL", u.email, error.message);
  } else {
    const authId = data.user?.id;
    console.log("OK", u.email, authId ?? "(no id returned)");
    // For restaurant_owner, update the profile row to match the auth user ID
    if (u.email === "owner@cravekart.app" && authId) {
      // Delete the old profile row with the seed UUID
      await supabase.from("users").delete().eq("email", u.email);
      // Insert with the correct auth user ID
      await supabase.from("users").insert({
        id: authId,
        email: u.email,
        name: u.name,
        role: "restaurant_owner",
        phone: "+91-9876543210",
      });
      // Link restaurant to this owner
      await supabase.from("restaurants").update({ owner_id: authId }).eq("name", "Pizza Palace");
      console.log("OK linked Pizza Palace to", authId);
    }
  }
}
