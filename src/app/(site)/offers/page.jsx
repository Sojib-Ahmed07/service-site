// src/app/(site)/offers/page.jsx
import { Tag } from "lucide-react";
import { PageHero, ServiceCard } from "@/components/site/sections";
import { CtaBand } from "@/components/site/server-sections";
import { getCategories, getCategoriesBySlugs } from "@/server/queries/catalog";
import { couponRestrictions } from "@/lib/constants";
import { PageBody } from "@/components/site/blocks";
import { getLiveCoupons, getPage, pageMetadata } from "@/server/queries/content";
import { getContentVars, getOfferSettings } from "@/server/queries/settings";
import { fillVars } from "@/lib/cms";
import { formatDate, money } from "@/lib/utils";

/** Edited in Admin › Content › Pages › Current offers (codes come from Admin › Promo codes). */
export const generateMetadata = () => pageMetadata("/offers");

export default async function OffersPage() {
  const [live, settings, categories, page, vars] = await Promise.all([
    getLiveCoupons(),
    getOfferSettings(),
    getCategories(),
    getPage("/offers"),
    getContentVars(),
  ]);
  const onlyFor = (c) => (c.categoryIds?.length ? categories.find((x) => x.id === c.categoryIds[0])?.name : null);
  const seasonal = await getCategoriesBySlugs(settings.seasonal);
  return (
    <>
      <PageHero title={page.title} body={page.intro} />
      <PageBody blocks={page.blocks} className="pt-14" />
      <section className="container-x py-14">
        {live.length === 0 && <p className="text-muted">There are no offers running right now. Check back soon.</p>}
        <div className="grid gap-4 md:grid-cols-3">
          {live.map((c) => (
            <div key={c.code} className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
              <div className="bg-ink-800 px-6 py-6 text-white">
                <p className="font-display text-4xl font-semibold">
                  {c.type === "percent" ? `${c.value}% off` : `${money(c.value)} off`}
                </p>
                {c.description && <p className="mt-1 text-ink-100">{c.description}</p>}
                {(onlyFor(c) || c.restriction !== "anyone") && (
                  <p className="mt-2 text-sm text-ink-300">
                    {[onlyFor(c) && `${onlyFor(c)} only`, c.restriction !== "anyone" && couponRestrictions[c.restriction]]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-4 border-t-2 border-dashed border-line px-6 py-5">
                <span className="flex items-center gap-2 font-mono text-lg font-semibold tracking-wider">
                  <Tag className="size-4 text-brand-600" /> {c.code}
                </span>
                <span className="text-right text-xs text-muted">
                  {c.minSpend ? `Min. spend ${money(c.minSpend)}` : "No minimum"}
                  <br />
                  {c.expires
                    ? `Ends ${formatDate(c.expires, { day: "numeric", month: "short", year: "numeric" })}`
                    : "No end date"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      {seasonal.length > 0 && (
        <section className="container-x pb-6">
          <h2 className="text-2xl font-semibold">{fillVars(settings.seasonalTitle, vars) || "In season now"}</h2>
          {settings.seasonalText && <p className="mt-1 text-muted">{fillVars(settings.seasonalText, vars)}</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {seasonal.map((c) => (
              <ServiceCard key={c.slug} c={c} />
            ))}
          </div>
        </section>
      )}
      <CtaBand />
    </>
  );
}