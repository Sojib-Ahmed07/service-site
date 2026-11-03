import Link from "next/link";
import { Check, Star } from "lucide-react";
import { categories, faqs, images, suburbs, zones } from "@/lib/data";
import { site } from "@/lib/site";
import { HeroSearch } from "@/components/site/hero-search";
import { CtaBand, HowItWorks, MoreLink, ReviewWall, ServiceCard, ServiceTile, TrustStrip } from "@/components/site/sections";
import { SectionHeading } from "@/components/ui/misc";
import { Accordion } from "@/components/ui/interactive";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";

export default function HomePage() {
  const popular = categories.filter((c) => c.popular);
  return (
    <>
      {/* Hero ------------------------------------------------------------- */}
      <section className="container-x grid gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1fr_minmax(0,560px)] lg:items-center lg:gap-16 lg:pb-24 lg:pt-16">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="flex">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-4 fill-star text-star" />
              ))}
            </span>
            <span>
              <span className="font-semibold text-ink">4.8</span> from 4,800+ jobs across {site.region}
            </span>
          </p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[4.1rem]">
            Every job around the house, sorted.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
            Cleaning, pest control, gardening and repairs at fixed prices. Book in two minutes and we send a vetted local pro.
          </p>
          <div className="mt-8 max-w-xl">
            <HeroSearch />
          </div>
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
        </div>

        <div className="relative">
          <Photo
            src={images.hero}
            alt="A cleaner mopping a bright living room"
            sizes={1100}
            priority
            className="aspect-[4/5] rounded-[28px] sm:aspect-square lg:aspect-[11/12]"
          />
          {/* Booking status: the moment customers are buying */}
          <div className="settle absolute -left-3 bottom-6 w-[17.5rem] rounded-2xl bg-white p-4 shadow-[var(--shadow-float)] sm:-left-8 sm:bottom-10">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-success-50 text-success">
                <Check className="size-5" strokeWidth={2.5} />
              </span>
              <div>
                <p className="text-sm font-semibold">Booking confirmed</p>
                <p className="text-xs text-muted">Home clean, 3 bedrooms</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2.5 text-sm">
              <span className="text-muted">Thu, 9–11am</span>
              <span className="tabular font-semibold">$189.00</span>
            </div>
          </div>
          <div className="settle-late absolute right-3 top-4 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-float)] sm:right-6">
            <p className="text-xs text-muted">Every pro is</p>
            <p className="text-sm font-semibold">Police-checked and insured</p>
          </div>
        </div>
      </section>

      {/* Category strip -------------------------------------------------- */}
      <section className="border-t border-line">
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

      {/* Most booked ------------------------------------------------------ */}
      <section className="bg-paper py-16 sm:py-20">
        <div className="container-x">
          <SectionHeading title="Most booked this month" body="Fixed packages, so you see the price before you book." />
          <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((c) => (
              <ServiceCard key={c.slug} c={c} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works ----------------------------------------------------- */}
      <section className="container-x py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl sm:text-[2.6rem] sm:leading-[1.08]">Booked in minutes, not phone calls.</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              No chasing quotes or comparing tradies. Tell us what you need and when — we handle the rest.
            </p>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* One team --------------------------------------------------------- */}
      <section className="bg-ink-900">
        <div className="container-x grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
          <Photo
            src={images.cleaner}
            alt="A professional cleaning a kitchen sink"
            sizes={1000}
            className="aspect-[4/3] rounded-3xl"
          />
          <div>
            <h2 className="text-3xl text-white sm:text-[2.6rem] sm:leading-[1.08]">
              One booking. One team accountable for the result.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-300">
              We’re not a directory. We vet the professionals, set the prices, schedule the work and follow up afterwards. If
              anything goes wrong, you call us.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Fixed price before you book",
                "Pros vetted and insured",
                "Reminders and live updates",
                "48-hour make-it-right guarantee",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-[15px] text-ink-100">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-500 text-ink-950">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-12 border-t border-white/10 pt-10">
              <TrustStrip inverse className="lg:grid-cols-2" />
            </div>
          </div>
        </div>
      </section>

      {/* Reviews ---------------------------------------------------------- */}
      <section className="container-x py-16 sm:py-24">
        <SectionHeading
          title="What customers say"
          body="Reviews from verified bookings only."
          action={<MoreLink href="/help">Our guarantee</MoreLink>}
        />
        <div className="mt-10">
          <ReviewWall />
        </div>
      </section>

      {/* Areas ------------------------------------------------------------ */}
      <section className="border-y border-line bg-paper">
        <div className="container-x grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl">Covering {site.region}</h2>
            <p className="mt-3 text-lg text-muted">
              Five zones from Kingston to Brighton. Outer suburbs carry a small travel fee, shown at checkout.
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

      {/* FAQ -------------------------------------------------------------- */}
      <section className="container-x grid gap-10 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-3xl sm:text-[2.6rem] sm:leading-[1.08]">Questions</h2>
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

      <div className="-mt-10">
        <CtaBand />
      </div>
    </>
  );
}
