import { ServiceBrowser } from "@/components/site/service-browser";
import { PageHero } from "@/components/site/sections";

export const metadata = { title: "All services" };

export default async function ServicesPage({ searchParams }) {
  const { q = "", group = "All", suburb = "" } = await searchParams;
  return (
    <>
      <PageHero
        title="Services across Greater Hobart"
        body="Fixed-price packages, booked online in a couple of minutes. Pick a service to see what’s included."
      />
      <ServiceBrowser initialQuery={q} initialGroup={group} suburb={suburb} />
    </>
  );
}
