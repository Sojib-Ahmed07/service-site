import { notFound } from "next/navigation";
import {
  addOns,
  bookingMessages,
  bookings,
  getBooking,
  getCategory,
  getCustomer,
  getPackage,
  getSuburb,
  providers,
} from "@/lib/data";
import { BookingManager } from "@/components/admin/booking-manager";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Booking ${id}` };
}

export default async function AdminBookingDetail({ params }) {
  const { id } = await params;
  const booking = getBooking(id);
  if (!booking) notFound();

  const category = getCategory(booking.category);
  // Candidate providers = anyone with the right skill. The client panel ranks/filters them.
  const candidates = providers
    .filter((p) => p.skills.includes(booking.category))
    .map((p) => ({
      ...p,
      jobsThatDay: bookings.filter((b) => b.providerId === p.id && b.date === booking.date && b.id !== booking.id).length,
    }));

  return (
    <BookingManager
      booking={booking}
      category={category}
      pkg={getPackage(booking.packageId)}
      extras={addOns.filter((a) => booking.addOns.includes(a.id))}
      customer={getCustomer(booking.customerId)}
      zone={getSuburb(booking.suburb)?.zone}
      candidates={candidates}
      messages={bookingMessages[booking.id] ?? []}
    />
  );
}
