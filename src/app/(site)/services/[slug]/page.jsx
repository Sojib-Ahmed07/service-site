// src/app/(site)/services/[slug]/page.jsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Check, ChevronRight, Clock, ShieldCheck, Star, Wallet } from "lucide-react";
import { Photo } from "@/components/ui/photo";
import { getAddOnsFor, getCategories, getCategory, getPackagesFor, toCard } from "@/server/queries/catalog";
import { getBanner } from "@/server/queries/content";
import { getBookingRules, getBusiness } from "@/server/queries/settings";
import { PackagePicker } from "@/components/site/package-picker";
import { PromoBanner, ServiceCard } from "@/components/site/sections";
import { CtaBand, ReviewWall } from "@/components/site/server-sections";
import { Accordion } from "@/components/ui/interactive";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [c, business] = await Promise.all([getCategory(slug), getBusiness()]);
  if (!c) return {};
  return {
    title: c.seoTitle || `${c.name} in ${business.city}`,
    description: c.seoDescription || c.description,
  };
}

export default async function ServiceDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const { suburb = "" } = await searchParams;
  const c = await getCategory(slug);
  if (!c) notFound();

  const [categories, packages, addOns, rules, banner] = await Promise.all([
    getCategories(),
    getPackagesFor(c),
    getAddOnsFor(c),
    getBookingRules(),
    getBanner("Service pages"),
  ]);
  const noticeDays = Math.ceil((Number(rules.minNoticeHours) || 0) / 24);
  const related = categories.filter((x) => x.group === c.group && x.slug !== c.slug).slice(0, 3);

  return (
    <>
      <section className="container-x pt-6 sm:pt-8">
        {banner && <PromoBanner banner={banner} className="mb-5" />}
        <nav className="flex items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/services" className="hover:text-ink">
            Services
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-ink">{c.name}</span>
        </nav>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-14">
          <div>
            <h1 className="text-4xl leading-[1.05] tracking-[-0.035em] sm:text-[3.4rem]">{c.name}</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{c.description}</p>
            {c.reviews > 0 && (
              <p className="mt-5 flex items-center gap-2 text-[15px]">
                <Star className="size-4 fill-star text-star" />
                <span className="font-semibold">{c.rating}</span>
                <span className="text-muted">
                  from {c.reviews.toLocaleString("en-AU")} {c.reviews === 1 ? "review" : "reviews"}
                </span>
              </p>
            )}
            <ul className="mt-6 grid gap-2.5 text-[15px] sm:grid-cols-2">
              {[
                [<BadgeCheck key="a" />, "Vetted and insured pros"],
                [<ShieldCheck key="b" />, `${rules.guaranteeHours}-hour make-it-right guarantee`],
                [
                  <Clock key="c" />,
                  noticeDays === 0 ? "Same-day slots available" : noticeDays === 1 ? "Next-day slots available" : `Book from ${noticeDays} days ahead`,
                ],
                [<Wallet key="d" />, "Fixed price, GST included"],
              ].map(([icon, label]) => (
                <li key={label} className="flex items-center gap-2.5 text-ink-700 [&_svg]:size-[18px] [&_svg]:text-ink-900">
                  {icon} {label}
                </li>
              ))}
            </ul>
          </div>
          <Photo src={c.image} alt={c.name} sizes={1100} priority className="aspect-[16/11] rounded-3xl" />
        </div>
      </section>

      <PackagePicker
        category={toCard(c)}
        packages={packages}
        addOns={addOns}
        suburb={suburb}
        freeChangeHours={Number(rules.freeCancelHours) || 0}
      >
        <section>
          <h2 className="text-2xl font-semibold">What’s included</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {c.includes.map((i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-line bg-white p-4 text-[15px]">
                <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} /> {i}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Recent reviews</h2>
          <div className="mt-5">
            <ReviewWall category={c.slug} />
          </div>
        </section>

        {c.faqs.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-semibold">Common questions</h2>
            <Accordion items={c.faqs} />
          </section>
        )}
      </PackagePicker>

      {related.length > 0 && (
        <section className="container-x pb-6">
          <h2 className="text-2xl font-semibold">Often booked with</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <ServiceCard key={r.slug} c={r} />
            ))}
          </div>
        </section>
      )}

      <CtaBand title={`Book ${c.name.toLowerCase()} today.`} />
    </>
  );
}