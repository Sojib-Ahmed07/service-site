import { notFound } from "next/navigation";
import { addOnsFor, getCategory, packagesFor } from "@/lib/data";
import { BookingFlow } from "@/components/site/booking-flow";

export const metadata = { title: "Book a service" };

export default async function BookPage({ params, searchParams }) {
  const { slug } = await params;
  const { pkg, addons = "", suburb = "" } = await searchParams;
  const category = getCategory(slug);
  if (!category) notFound();

  const packages = packagesFor(slug);
  const selected = packages.find((p) => p.id === pkg) ?? packages.find((p) => p.popular) ?? packages[0];

  return (
    <BookingFlow
      category={category}
      packages={packages}
      addOns={addOnsFor(slug)}
      initialPackageId={selected.id}
      initialAddOns={addons.split(",").filter(Boolean)}
      initialSuburb={suburb}
    />
  );
}
