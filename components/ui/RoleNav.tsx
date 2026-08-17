"use client";

import dynamic from "next/dynamic";

import { useIsAdmin, useIsRestaurantOwner } from "@/lib/auth";

const AdminNav = dynamic(
  () => import("@/components/ui/AdminNav").then((m) => m.AdminNav),
  { ssr: false }
);
const OwnerNav = dynamic(
  () => import("@/components/ui/OwnerNav").then((m) => m.OwnerNav),
  { ssr: false }
);
const CustomerNav = dynamic(
  () => import("@/components/ui/CustomerNav").then((m) => m.CustomerNav),
  { ssr: false }
);

export function RoleNav() {
  const isAdmin = useIsAdmin();
  const isOwner = useIsRestaurantOwner();

  if (isAdmin) return <AdminNav />;
  if (isOwner) return <OwnerNav />;
  return <CustomerNav />;
}
