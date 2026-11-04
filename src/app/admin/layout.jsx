// src/app/admin/layout.jsx
import { count, eq } from "drizzle-orm";
import { AdminShell } from "@/components/admin/shell";
import { db } from "@/db";
import { bookings, enquiries, partnerApplications, reviews } from "@/db/schema";
import { requireAdmin } from "@/server/session";
import { getBusiness } from "@/server/queries/settings";

export const metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

// Admin pages always show live data and are only for signed-in admins.
export const dynamic = "force-dynamic";

async function sidebarCounts() {
  const n = async (q) => (await q)[0]?.n ?? 0;
  const [newBookings, openEnquiries, newApplications, pendingReviews] = await Promise.all([
    n(db.select({ n: count() }).from(bookings).where(eq(bookings.status, "new"))),
    n(db.select({ n: count() }).from(enquiries).where(eq(enquiries.status, "open"))),
    n(db.select({ n: count() }).from(partnerApplications).where(eq(partnerApplications.status, "new"))),
    n(db.select({ n: count() }).from(reviews).where(eq(reviews.status, "pending"))),
  ]);
  return { newBookings, openInbox: openEnquiries + newApplications, pendingReviews };
}

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin();
  const [counts, business] = await Promise.all([sidebarCounts(), getBusiness()]);
  return (
    <AdminShell user={{ name: admin.name, teamRole: admin.teamRole }} counts={counts} businessName={business.name}>
      {children}
    </AdminShell>
  );
}