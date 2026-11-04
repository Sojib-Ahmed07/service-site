// src/app/(site)/services/page.jsx
import { ServiceBrowser } from "@/components/site/service-browser";
import { PageHero } from "@/components/site/sections";
import { getCategories } from "@/server/queries/catalog";
import { getBusiness } from "@/server/queries/settings";

export const metadata = { title: "All services" };

export default async function ServicesPage({ searchParams }) {
  const { q = "", group = "All", suburb = "" } = await searchParams;
  const [categories, business] = await Promise.all([getCategories(), getBusiness()]);
  return (
    <>
      <PageHero
        title={`Services across ${business.region}`}
        body="Fixed-price packages, booked online in a couple of minutes. Pick a service to see what’s included."
      />
      <ServiceBrowser categories={categories} initialQuery={q} initialGroup={group} suburb={suburb} />
    </>
  );
}