// src/app/(site)/book/[slug]/page.jsx
import { notFound } from "next/navigation";
import { getAddOnsFor, getAreas, getCategory, getPackagesFor } from "@/server/queries/catalog";
import { getBookingRules } from "@/server/queries/settings";
import { BookingFlow } from "@/components/site/booking-flow";

export const metadata = { title: "Book a service" };

export default async function BookPage({ params, searchParams }) {
  const { slug } = await params;
  const { pkg, addons = "", suburb = "" } = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  const [packages, addOns, { suburbs }, rules] = await Promise.all([
    getPackagesFor(category),
    getAddOnsFor(category),
    getAreas(),
    getBookingRules(),
  ]);
  if (!packages.length) notFound();
  const selected = packages.find((p) => p.id === pkg) ?? packages.find((p) => p.popular) ?? packages[0];
  // Only keep extras from the URL that really belong to this service.
  const validAddOns = String(addons)
    .split(",")
    .filter((id) => addOns.some((a) => a.id === id));

  return (
    <BookingFlow
      category={category}
      packages={packages}
      addOns={addOns}
      suburbs={suburbs}
      rules={{
        timeSlots: rules.timeSlots,
        sundays: Boolean(rules.sundays),
        minNoticeHours: Number(rules.minNoticeHours) || 0,
        windowDays: Number(rules.windowDays) || 14,
      }}
      initialPackageId={selected.id}
      initialAddOns={validAddOns}
      initialSuburb={suburb}
    />
  );
}