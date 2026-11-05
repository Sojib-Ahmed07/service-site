// src/app/(site)/services/page.jsx
import { ServiceBrowser } from "@/components/site/service-browser";
import { PageHero } from "@/components/site/sections";
import { getCategories, toCard } from "@/server/queries/catalog";
import { getPage, pageMetadata } from "@/server/queries/content";
import { PageBody } from "@/components/site/blocks";

/** Header text is edited in Admin › Content › Pages. */
export const generateMetadata = () => pageMetadata("/services");

export default async function ServicesPage({ searchParams }) {
  const { q = "", group = "All", suburb = "" } = await searchParams;
  const [categories, page] = await Promise.all([getCategories(), getPage("/services")]);
  return (
    <>
      <PageHero title={page.title} body={page.intro} />
      <ServiceBrowser categories={categories.map(toCard)} initialQuery={q} initialGroup={group} suburb={suburb} />
      <PageBody blocks={page.blocks} className="pb-14" />
    </>
  );
}