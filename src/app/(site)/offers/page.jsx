// src/app/(site)/offers/page.jsx
import { Tag } from "lucide-react";
import { PageHero, ServiceCard } from "@/components/site/sections";
import { CtaBand } from "@/components/site/server-sections";
import { getCategoriesBySlugs } from "@/server/queries/catalog";
import { getLiveCoupons } from "@/server/queries/content";
import { getOfferSettings } from "@/server/queries/settings";
import { formatDate, money } from "@/lib/utils";

export const metadata = { title: "Offers" };

export default async function OffersPage() {
  const [live, settings] = await Promise.all([getLiveCoupons(), getOfferSettings()]);
  const seasonal = await getCategoriesBySlugs(settings.seasonal);
  return (
    <>
      <PageHero title="Current offers" body="Enter the code at checkout. One code per booking." />
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
          <h2 className="text-2xl font-semibold">In season now</h2>
          <p className="mt-1 text-muted">Spring in Hobart means spiders, blocked gutters and mossy paths.</p>
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