import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // VULN (CSRF): the Supabase session cookie is written with SameSite=None
      // (Secure is required alongside) instead of SameSite=Lax/Strict. The
      // /api/profile/update route authenticates ONLY via this cookie, with no
      // CSRF token and no Origin/Referer check, so a malicious external page
      // can fetch() it with `credentials: "include"` (or auto-submit a form)
      // while the victim is signed in and silently change the victim's profile.
      cookieOptions: {
        // VULN (CSRF): SameSite=None allows the cookie to be sent on cross-
        // site requests. On HTTPS this enables CSRF attacks against state-
        // changing endpoints that trust the cookie alone (e.g. /api/profile/update).
        // On HTTP (localhost dev) browsers reject SameSite=None cookies
        // regardless of Secure, so we fall back to Lax to keep auth working.
        sameSite:
          typeof window !== "undefined" && window.location.protocol === "https:"
            ? "none"
            : "lax",
        secure:
          typeof window !== "undefined" && window.location.protocol === "https:",
      },
    }
  );
}
