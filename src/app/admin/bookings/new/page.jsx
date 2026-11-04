// src/app/admin/bookings/new/page.jsx
import { NewBookingForm } from "@/components/admin/new-booking-form";
import { AdminHeader } from "@/components/admin/ui";
import { getAddOnsFor, getAreas, getCategories, getPackagesFor } from "@/server/queries/catalog";
import { getCustomerPicker } from "@/server/queries/admin";
import { getBookingRules } from "@/server/queries/settings";

export const metadata = { title: "New booking" };

export default async function NewBookingPage({ searchParams }) {
  const { customer = "" } = await searchParams;
  const [categories, { suburbs }, customers, rules] = await Promise.all([
    getCategories(),
    getAreas(),
    getCustomerPicker(),
    getBookingRules(),
  ]);
  const catalog = await Promise.all(
    categories.map(async (c) => ({
      slug: c.slug,
      name: c.name,
      packages: await getPackagesFor(c),
      addOns: await getAddOnsFor(c),
    })),
  );
  return (
    <>
      <AdminHeader
        back={{ href: "/admin/bookings", label: "Bookings" }}
        title="New booking"
        description="For phone or email bookings. The customer gets the same confirmation as an online booking."
      />
      <NewBookingForm
        catalog={catalog.filter((c) => c.packages.length)}
        customers={customers}
        suburbs={suburbs}
        timeSlots={rules.timeSlots}
        initialCustomerId={String(customer)}
      />
    </>
  );
}