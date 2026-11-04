// src/app/(site)/book/[slug]/page.jsx
import { notFound } from "next/navigation";
import { getAddOnsFor, getAreas, getCategory, getPackagesFor, toCard } from "@/server/queries/catalog";
import { getBookingRules } from "@/server/queries/settings";
import { getMyAddresses } from "@/server/queries/account";
import { getCurrentUser } from "@/server/session";
import { BookingFlow } from "@/components/site/booking-flow";

export const metadata = { title: "Book a service" };

export default async function BookPage({ params, searchParams }) {
  const { slug } = await params;
  const { pkg, addons = "", suburb = "" } = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  const [packages, addOns, { suburbs }, rules, user] = await Promise.all([
    getPackagesFor(category),
    getAddOnsFor(category),
    getAreas(),
    getBookingRules(),
    getCurrentUser(),
  ]);
  // Saved addresses in suburbs we still cover.
  const savedAddresses = user ? (await getMyAddresses(user.id)).filter((a) => suburbs.some((s) => s.name === a.suburb)) : [];
  const here = `/book/${slug}?${new URLSearchParams({ pkg: pkg ?? "", addons, suburb }).toString()}`;
  if (!packages.length) notFound();
  const selected = packages.find((p) => p.id === pkg) ?? packages.find((p) => p.popular) ?? packages[0];
  // Only keep extras from the URL that really belong to this service.
  const validAddOns = String(addons)
    .split(",")
    .filter((id) => addOns.some((a) => a.id === id));

  return (
    <BookingFlow
      category={toCard(category)}
      packages={packages}
      addOns={addOns}
      suburbs={suburbs}
      rules={{
        timeSlots: rules.timeSlots,
        sundays: Boolean(rules.sundays),
        minNoticeHours: Number(rules.minNoticeHours) || 0,
        windowDays: Number(rules.windowDays) || 14,
      }}
      user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
      savedAddresses={savedAddresses}
      loginHref={`/login?next=${encodeURIComponent(here)}`}
      initialPackageId={selected.id}
      initialAddOns={validAddOns}
      initialSuburb={suburb}
    />
  );
}