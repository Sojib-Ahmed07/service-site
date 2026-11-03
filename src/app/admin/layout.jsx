import { AdminShell } from "@/components/admin/shell";

export const metadata = { title: { default: "Admin", template: "%s · Sorted Admin" }, robots: { index: false } };

/**
 * Protect this segment once auth is wired:
 *   const session = await auth(); if (session?.user.role !== "admin") redirect("/login");
 * (or do it in src/proxy.js — Next 16's renamed middleware).
 */
export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
