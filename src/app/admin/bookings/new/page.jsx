import { NewBookingForm } from "@/components/admin/new-booking-form";
import { AdminHeader } from "@/components/admin/ui";

export const metadata = { title: "New booking" };

export default function NewBookingPage() {
  return (
    <>
      <AdminHeader
        back={{ href: "/admin/bookings", label: "Bookings" }}
        title="New booking"
        description="For phone or email bookings. The customer gets the same confirmation as an online booking."
      />
      <NewBookingForm />
    </>
  );
}
