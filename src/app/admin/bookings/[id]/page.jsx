// src/app/admin/bookings/[id]/page.jsx
import { notFound } from "next/navigation";
import { BookingManager } from "@/components/admin/booking-manager";
import { getAdminBooking } from "@/server/queries/admin";
import { getBookingRules, getNotificationSettings } from "@/server/queries/settings";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Booking ${id}` };
}

export default async function AdminBookingDetail({ params }) {
  const { id } = await params;
  const [data, rules, notifications] = await Promise.all([getAdminBooking(id), getBookingRules(), getNotificationSettings()]);
  if (!data) notFound();
  return <BookingManager data={data} timeSlots={rules.timeSlots} jobSheetTemplate={notifications.jobSheetTemplate} />;
}