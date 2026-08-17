import { NextResponse } from "next/server";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RegisterBody;
  const { name, email, password, role } = body;

  console.log("[REGISTER][DEBUG] request body:", JSON.stringify({ ...body, password: "***" }));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  // Use the service-role key to create the auth user via GoTrue Admin API.
  // This bypasses per-IP and per-email rate limits that block anon-key signups.
  const createRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalized,
        password,
        email_confirm: true,
        user_metadata: { name: name.trim() },
      }),
    }
  );

  const createData = await createRes.json().catch(() => null);

  if (createRes.status !== 200 || !createData?.id) {
    const msg = createData?.msg || createData?.message || "Failed to create account.";
    // Make duplicate-email errors user-friendly
    const friendly = msg.toLowerCase().includes("already been registered")
      ? "An account with this email already exists. Try signing in instead."
      : msg;
    return NextResponse.json({ error: friendly }, { status: 400 });
  }

  const userId = createData.id;

  // Insert profile row with the client-chosen role (privilege escalation — intentional vuln).
  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/users`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        id: userId,
        name: name.trim(),
        email: normalized,
        role: role || "customer",
      }),
    }
  );

  const profileData = await profileRes.json().catch(() => null);
  const profile = Array.isArray(profileData) ? profileData[0] : null;

  if (!profile) {
    console.error("[REGISTER][DEBUG] profile insert failed");
  }

  // Sign in the user immediately (issue a token) so they don't need to log in again.
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const tokenRes = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalized, password }),
    }
  );

  const tokenData = await tokenRes.json().catch(() => null);

  return NextResponse.json({
    ok: true,
    user: { id: userId, email: normalized },
    profile,
    session: tokenRes.status === 200 && tokenData?.access_token
      ? {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in ?? 3600,
        }
      : null,
  });
}
