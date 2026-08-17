"use client";

import { useCallback, useEffect, useState } from "react";

export type CartLine = { id: string; name: string; price: number; qty: number; restaurant_id?: string; restaurant_name?: string };

export type UserProfile = {
  id?: string;
  email?: string;
  name?: string | null;
  role?: string;
  phone?: string | null;
  delivery_address?: string | null;
  restaurant_id?: string | null;
};

// Broadcast events so open pages stay in sync across tabs/actions.
export const CART_EVENT = "foodrush:cart-changed";
export const AUTH_EVENT = "foodrush:auth-changed";

export function getCurrentUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("foodrush_user") ?? "null") as UserProfile | null;
  } catch {
    return null;
  }
}

// Carts are scoped per user: foodrush_cart_<profileId> (guests share _guest).
// This keeps each signed-in user's cart saved independently.
export function getCartKey(): string {
  const user = getCurrentUser();
  const scope = user?.id ?? user?.email ?? "guest";
  return `foodrush_cart_${scope}`;
}

export function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getCartKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartLine[]) {
  localStorage.setItem(getCartKey(), JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addItemToCart(item: Pick<CartLine, "id" | "name" | "price" | "restaurant_id" | "restaurant_name">): CartLine[] {
  const cart = loadCart();
  const existing = cart.find((c) => c.id === item.id);
  if (existing) existing.qty += 1;
  else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1, restaurant_id: item.restaurant_id, restaurant_name: item.restaurant_name });
  saveCart(cart);
  return cart;
}

export function removeItemFromCart(id: string): CartLine[] {
  const next = loadCart().filter((c) => c.id !== id);
  saveCart(next);
  return next;
}

export function clearCartStore() {
  localStorage.removeItem(getCartKey());
  window.dispatchEvent(new Event(CART_EVENT));
}

export function useCart() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setCart(loadCart());
      setReady(true);
    };
    const t = window.setTimeout(sync, 0);
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener(AUTH_EVENT, sync);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener(AUTH_EVENT, sync);
    };
  }, []);

  const add = useCallback((item: Pick<CartLine, "id" | "name" | "price" | "restaurant_id" | "restaurant_name">) => {
    setCart(addItemToCart(item));
  }, []);

  const remove = useCallback((id: string) => {
    setCart(removeItemFromCart(id));
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    const next = loadCart()
      .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
      .filter((l) => l.qty > 0);
    saveCart(next);
    setCart(next);
  }, []);

  const clear = useCallback(() => {
    clearCartStore();
    setCart([]);
  }, []);

  const count = cart.reduce((s, l) => s + l.qty, 0);

  return { cart, add, remove, updateQty, clear, count, ready };
}
