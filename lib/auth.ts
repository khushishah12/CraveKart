"use client";

import { useSyncExternalStore } from "react";
import { AUTH_EVENT, getCurrentUser, type UserProfile } from "@/lib/cart";

export function isAdminUser(): boolean {
  return getCurrentUser()?.role === "admin";
}

export function isRestaurantOwnerUser(): boolean {
  return getCurrentUser()?.role === "restaurant_owner";
}

// useSyncExternalStore requires getSnapshot to return a stable value between
// renders unless the store actually changed (otherwise React sees an
// always-changed snapshot and re-renders in an infinite loop). The profile
// object is parsed from localStorage, so we cache it and only re-parse after
// an auth or storage event invalidates the cache.
let cachedProfile: UserProfile | null = null;
let cachedProfileKey: string | null = null;

function invalidateProfileCache() {
  cachedProfile = null;
  cachedProfileKey = null;
}

function subscribe(cb: () => void) {
  const onAuth = () => {
    invalidateProfileCache();
    cb();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === "foodrush_user") invalidateProfileCache();
    cb();
  };
  window.addEventListener(AUTH_EVENT, onAuth);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AUTH_EVENT, onAuth);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot() {
  return false;
}

export function useIsAdmin(): boolean {
  return useSyncExternalStore(subscribe, isAdminUser, getServerSnapshot);
}

function getServerSnapshotOwner() {
  return false;
}

export function useIsRestaurantOwner(): boolean {
  return useSyncExternalStore(subscribe, isRestaurantOwnerUser, getServerSnapshotOwner);
}

function getProfileSnapshot(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const key = "foodrush_user";
  if (cachedProfileKey !== key) {
    try {
      cachedProfile = JSON.parse(
        window.localStorage.getItem(key) ?? "null"
      ) as UserProfile | null;
    } catch {
      cachedProfile = null;
    }
    cachedProfileKey = key;
  }
  return cachedProfile;
}

function getServerProfileSnapshot(): UserProfile | null {
  return null;
}

// Hydration-safe read of the signed-in profile (localStorage) — the server
// snapshot is always null, so SSR HTML and the first client render match.
export function useCurrentUser(): UserProfile | null {
  return useSyncExternalStore(
    subscribe,
    getProfileSnapshot,
    getServerProfileSnapshot
  );
}
