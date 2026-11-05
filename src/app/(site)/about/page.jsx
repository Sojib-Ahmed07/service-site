// src/app/(site)/about/page.jsx
import { PageHero } from "@/components/site/sections";
import { Blocks } from "@/components/site/blocks";
import { CtaBand, TrustStrip } from "@/components/site/server-sections";
import { getAreas, getCategories } from "@/server/queries/catalog";
import { getPage, pageMetadata } from "@/server/queries/content";
import { getBookingRules } from "@/server/queries/settings";

/** Text is edited in Admin › Content › Pages › About us. The figures are live. */
export const generateMetadata = () => pageMetadata("/about");

export default async function AboutPage() {
  const [page, categories, { suburbs }, rules] = await Promise.all([
    getPage("/about"),
    getCategories(),
    getAreas(),
    getBookingRules(),
  ]);
  const figures = [
    { value: String(categories.length), label: `${categories.length === 1 ? "service" : "services"}, one booking flow` },
    { value: String(suburbs.length), label: "suburbs we cover" },
    { value: `${rules.guaranteeHours} hrs`, label: "to report a problem — we fix it free" },
  ];
  return (
    <>
      <PageHero title={page.title} body={page.intro} />
      <section className="container-x grid gap-12 py-16 lg:grid-cols-2">
        <div className="min-w-0">
          <Blocks blocks={page.blocks} className="space-y-5 text-lg leading-relaxed text-muted" />
        </div>
        <dl className="grid gap-px self-start overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-3 lg:grid-cols-1">
          {figures.map((f) => (
            <div key={f.label} className="bg-surface p-6">
              <dt className="text-muted">{f.label}</dt>
              <dd className="mt-1 font-display text-4xl font-semibold">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="border-y border-line bg-surface py-14">
        <div className="container-x">
          <TrustStrip />
        </div>
      </section>
      <CtaBand />
    </>
  );
}