import { BookingsTable } from "@/components/admin/bookings-table";
import { AdminHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Bookings" };

export default async function AdminBookingsPage({ searchParams }) {
  const { status = "all" } = await searchParams;
  return (
    <>
      <AdminHeader
        title="Bookings"
        description="Every job booked through the site or by phone. Assign a provider from each booking."
        actions={
          <>
            <ButtonLink href="#" variant="outline" size="sm">
              Export CSV
            </ButtonLink>
            <ButtonLink href="/admin/bookings/new" size="sm">
              New booking
            </ButtonLink>
          </>
        }
      />
      <BookingsTable initialStatus={status} />
    </>
  );
}
