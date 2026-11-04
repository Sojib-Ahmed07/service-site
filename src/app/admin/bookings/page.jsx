// src/app/admin/bookings/page.jsx
import { BookingsTable } from "@/components/admin/bookings-table";
import { AdminHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { bookingStatus } from "@/lib/constants";
import { getAdminOptions, listBookings } from "@/server/queries/admin";

export const metadata = { title: "Bookings" };

export default async function AdminBookingsPage({ searchParams }) {
  const sp = await searchParams;
  const filters = {
    status: sp.status in bookingStatus ? sp.status : "all",
    category: typeof sp.category === "string" && sp.category ? sp.category : "all",
    zone: typeof sp.zone === "string" && sp.zone ? sp.zone : "all",
    q: typeof sp.q === "string" ? sp.q.slice(0, 100) : "",
    sort: ["newest", "value"].includes(sp.sort) ? sp.sort : "date",
    page: Number(sp.page) || 1,
  };
  const [data, options] = await Promise.all([listBookings(filters), getAdminOptions()]);
  const exportQs = new URLSearchParams(
    Object.entries(filters).filter(([k, v]) => k !== "page" && v && v !== "all" && v !== "date"),
  ).toString();
  return (
    <>
      <AdminHeader
        title="Bookings"
        description="Every job booked through the site or by phone. Assign a provider from each booking."
        actions={
          <>
            <a
              href={`/admin/bookings/export${exportQs ? `?${exportQs}` : ""}`}
              className="inline-flex h-9 items-center rounded-[10px] border border-line-strong bg-surface px-3.5 text-sm font-semibold hover:bg-paper"
            >
              Export CSV
            </a>
            <ButtonLink href="/admin/bookings/new" size="sm">
              New booking
            </ButtonLink>
          </>
        }
      />
      <BookingsTable data={data} filters={filters} options={options} />
    </>
  );
}