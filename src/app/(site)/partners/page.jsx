// src/app/(site)/partners/page.jsx
import { PageHero } from "@/components/site/sections";
import { Blocks } from "@/components/site/blocks";
import { PartnerForm } from "@/components/site/forms";
import { getAreas, getCategories } from "@/server/queries/catalog";
import { getPage, pageMetadata } from "@/server/queries/content";

/** Text and the perks cards are edited in Admin › Content › Pages › Work with us. */
export const generateMetadata = () => pageMetadata("/partners");

export default async function PartnersPage() {
  const [categories, { zones }, page] = await Promise.all([getCategories(), getAreas(), getPage("/partners")]);
  return (
    <>
      <PageHero title={page.title} body={page.intro} />
      <section className="container-x py-14">
        <Blocks blocks={page.blocks} wide />
        <div className={`${page.blocks.length ? "mt-12 " : ""}rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-10`}>
          <h2 className="text-2xl font-semibold">Apply to join</h2>
          <p className="mb-8 mt-1 text-muted">Takes about three minutes.</p>
          <PartnerForm categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} zones={zones} />
        </div>
      </section>
    </>
  );
}