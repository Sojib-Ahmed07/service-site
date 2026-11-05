// src/app/(site)/page.jsx
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { getAreas, getCategories, getPackagesFor, getRatingSummary, toCard } from "@/server/queries/catalog";
import { getBanner, getFaqs } from "@/server/queries/content";
import { getBookingRules, getBusiness, getContentVars, getHomepage, getImages } from "@/server/queries/settings";
import { HeroSearch } from "@/components/site/hero-search";
import { HowItWorks, MoreLink, PromoBanner, ServiceCard, ServiceTile } from "@/components/site/sections";
import { CtaBand, ReviewWall, TrustStrip } from "@/components/site/server-sections";
import { SectionHeading } from "@/components/ui/misc";
import { Accordion } from "@/components/ui/interactive";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { fillVars } from "@/lib/cms";
import { money2 } from "@/lib/utils";

/** All wording, the steps, photos and the section order are edited in Admin › Content › Homepage. */
export default async function HomePage() {
  const [categories, { zones, suburbs }, faqs, site, images, rating, home, vars, rules, banner] = await Promise.all([
    getCategories(),
    getAreas(),
    getFaqs("general"),
    getBusiness(),
    getImages(),
    getRatingSummary(),
    getHomepage(),
    getContentVars(),
    getBookingRules(),
    getBanner("Home hero"),
  ]);
  const t = (text) => fillVars(text, vars);
  const popular = categories.filter((c) => c.popular);

  // The floating "booking confirmed" card shows a real package and arrival window.
  const example = popular[0] ?? categories[0];
  const examplePackage = example ? (await getPackagesFor(example))[0] : null;
  const exampleSlot = rules.timeSlots?.[1] ?? rules.timeSlots?.[0];

  const sections = {
    browse: categories.length > 0 && (
      <section key="browse" className="border-t border-line">
        <div className="container-x py-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl sm:text-[1.75rem]">Browse services</h2>
            <MoreLink href="/services">All services</MoreLink>
          </div>
          <div className="no-scrollbar -mx-4 mt-6 grid auto-cols-[112px] grid-flow-col gap-4 overflow-x-auto px-4 sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-6 sm:px-0">
            {categories.map((c) => (
              <ServiceTile key={c.slug} c={c} />
            ))}
          </div>
        </div>
      </section>
    ),

    popular: popular.length > 0 && (
      <section key="popular" className="bg-paper py-16 sm:py-20">
        <div className="container-x">
          <SectionHeading title={t(home.popularTitle)} body={t(home.popularText)} />
          <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((c) => (
              <ServiceCard key={c.slug} c={c} />
            ))}
          </div>
        </div>
      </section>
    ),

    how: (
      <section key="how" className="container-x py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl sm:text-[2.6rem] sm:leading-[1.08]">{t(home.howTitle)}</h2>
            {home.howText && <p className="mt-4 text-lg leading-relaxed text-muted">{t(home.howText)}</p>}
          </div>
          <HowItWorks steps={home.steps.map((s) => ({ title: t(s.title), body: t(s.body) }))} />
        </div>
      </section>
    ),

    team: (
      <section key="team" className="bg-ink-900">
        <div className="container-x grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
          <Photo src={images.cleaner} alt="" sizes={1000} className="aspect-[4/3] rounded-3xl" />
          <div>
            <h2 className="text-3xl text-white sm:text-[2.6rem] sm:leading-[1.08]">{t(home.teamTitle)}</h2>
            {home.teamText && <p className="mt-4 text-lg leading-relaxed text-ink-300">{t(home.teamText)}</p>}
            {home.teamPoints?.length > 0 && (
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {home.teamPoints.map((point, i) => (
                  <li key={i} className="flex items-center gap-3 text-[15px] text-ink-100">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-500 text-ink-950">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    {t(point)}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-12 border-t border-white/10 pt-10">
              <TrustStrip inverse className="lg:grid-cols-2" />
            </div>
          </div>
        </div>
      </section>
    ),

    reviews: (
      <section key="reviews" className="container-x py-16 sm:py-24">
        <SectionHeading
          title={t(home.reviewsTitle)}
          body={t(home.reviewsText)}
          action={<MoreLink href="/guarantee">Our guarantee</MoreLink>}
        />
        <div className="mt-10">
          <ReviewWall />
        </div>
      </section>
    ),

    areas: zones.length > 0 && (
      <section key="areas" className="border-y border-line bg-paper">
        <div className="container-x grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl">Covering {site.region}</h2>
            <p className="mt-3 text-lg text-muted">
              {zones.length} {zones.length === 1 ? "zone" : "zones"} across {site.region}. {t(home.areasText)}
            </p>
            <ButtonLink href="/areas" variant="outline" className="mt-6">
              Check your suburb
            </ButtonLink>
          </div>
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {zones.map((z) => (
              <div key={z} className="border-t border-line-strong pt-4">
                <dt className="font-semibold">{z}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-muted">
                  {suburbs
                    .filter((s) => s.zone === z)
                    .map((s) => s.name)
                    .join(", ")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    ),

    faq: faqs.length > 0 && (
      <section key="faq" className="container-x grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-3xl sm:text-[2.6rem] sm:leading-[1.08]">{t(home.faqTitle)}</h2>
          <p className="mt-3 text-lg text-muted">
            Can’t find an answer?{" "}
            <Link href="/help" className="font-medium text-ink underline underline-offset-4">
              Visit the help centre
            </Link>
            .
          </p>
        </div>
        <Accordion items={faqs} />
      </section>
    ),
  };

  return (
    <>
      {/* Hero (always first) ------------------------------------------------ */}
      <section className="container-x grid gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1fr_minmax(0,560px)] lg:items-center lg:gap-16 lg:pb-24 lg:pt-16">
        <div className="min-w-0">
          {banner && <PromoBanner banner={banner} className="mb-5" />}
          {rating.total > 0 && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="size-4 fill-star text-star" />
                ))}
              </span>
              <span>
                <span className="font-semibold text-ink">{rating.rating}</span> from {rating.total.toLocaleString("en-AU")}{" "}
                {rating.total === 1 ? "review" : "reviews"} across {site.region}
              </span>
            </p>
          )}
          <h1 className="mt-5 text-[2.6rem] leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[4.1rem]">
            {t(home.heroTitle)}
          </h1>
          {home.heroText && <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">{t(home.heroText)}</p>}
          <div className="mt-8 max-w-xl">
            <HeroSearch categories={categories.map(toCard)} suburbs={suburbs} />
          </div>
          {popular.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
              <span className="mr-1 text-muted">Popular:</span>
              {popular.map((c) => (
                <Link
                  key={c.slug}
                  href={`/services/${c.slug}`}
                  className="rounded-md px-2 py-1 font-medium text-ink-700 underline decoration-ink-200 underline-offset-4 hover:text-ink hover:decoration-ink-900"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <Photo
            src={images.hero}
            alt=""
            sizes={1100}
            priority
            className="aspect-[4/5] rounded-[28px] sm:aspect-square lg:aspect-[11/12]"
          />
          {example && examplePackage && (
            <div className="settle absolute -left-3 bottom-6 w-[17.5rem] rounded-2xl bg-white p-4 shadow-[var(--shadow-float)] sm:-left-8 sm:bottom-10">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-50 text-success">
                  <Check className="size-5" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Booking confirmed</p>
                  <p className="truncate text-xs text-muted">
                    {example.name}, {examplePackage.name}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-3 py-2.5 text-sm">
                <span className="truncate text-muted">{exampleSlot ?? "Next available"}</span>
                <span className="tabular font-semibold">
                  {money2(examplePackage.price)}
                  {examplePackage.priceUnit ?? ""}
                </span>
              </div>
            </div>
          )}
          {home.heroBadge && (
            <div className="settle-late absolute right-3 top-4 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-float)] sm:right-6">
              <p className="text-xs text-muted">Every pro is</p>
              <p className="text-sm font-semibold">{t(home.heroBadge)}</p>
            </div>
          )}
        </div>
      </section>

      {home.sections.filter((s) => s.visible).map((s) => sections[s.id] || null)}

      <div className="-mt-10">
        <CtaBand />
      </div>
    </>
  );
}