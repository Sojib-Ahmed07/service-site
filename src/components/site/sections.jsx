import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Headphones, ShieldCheck, Star, Wallet } from "lucide-react";
import { categories, images, reviews, getCategory } from "@/lib/data";
import { site } from "@/lib/site";
import { cn, money } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { SectionHeading, Stars } from "@/components/ui/misc";

/* Service card: photography first, then name and price ---------------------- */
export function ServiceCard({ c, size = "md" }) {
  return (
    <Link href={`/services/${c.slug}`} className="group flex flex-col">
      <div className="relative overflow-hidden rounded-2xl">
        <Photo
          src={c.image}
          alt={c.name}
          sizes={size === "lg" ? 900 : 600}
          className={cn(
            "transition-transform duration-500 group-hover:scale-[1.03]",
            size === "lg" ? "aspect-[4/3]" : "aspect-[5/4]",
          )}
        />
        {c.popular && (
          <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-ink shadow-sm">
            Popular
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold tracking-[-0.015em] group-hover:underline group-hover:decoration-ink-300 group-hover:underline-offset-4">
            {c.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <Star className="size-3.5 fill-star text-star" />
            <span className="font-medium text-ink">{c.rating}</span> ({c.reviews.toLocaleString()})
          </p>
        </div>
        <p className="tabular whitespace-nowrap text-right text-sm text-muted">
          from
          <span className="block text-[17px] font-semibold text-ink">
            {money(c.fromPrice)}
            {c.priceUnit && <span className="text-sm font-normal text-muted">{c.priceUnit}</span>}
          </span>
        </p>
      </div>
    </Link>
  );
}

export function ServiceGrid({ items = categories }) {
  return (
    <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((c) => (
        <ServiceCard key={c.slug} c={c} />
      ))}
    </div>
  );
}

/* Small round-thumb service shortcut (category strip) ----------------------- */
export function ServiceTile({ c }) {
  return (
    <Link href={`/services/${c.slug}`} className="group flex flex-col items-center gap-2.5 text-center">
      <Photo
        src={c.image}
        alt=""
        sizes={240}
        className="aspect-square w-full rounded-2xl ring-1 ring-line transition group-hover:ring-2 group-hover:ring-ink-900"
      />
      <span className="text-sm font-medium leading-tight">{c.name}</span>
    </Link>
  );
}

/* Trust strip --------------------------------------------------------------- */
export function TrustStrip({ className, inverse }) {
  const items = [
    { icon: <BadgeCheck />, title: "Vetted local pros", body: "ABN, insurance, police check and licence checked." },
    { icon: <Wallet />, title: "Fixed upfront prices", body: "GST included. No surprise call-out fees." },
    { icon: <ShieldCheck />, title: "48-hour guarantee", body: "Not right? We send someone back, free." },
    { icon: <Headphones />, title: "One local team", body: `Real people in ${site.city}, ${site.hours}.` },
  ];
  return (
    <div className={cn("grid gap-8 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((i) => (
        <div key={i.title}>
          <span className={cn("[&_svg]:size-6", inverse ? "text-brand-400" : "text-ink-900")}>{i.icon}</span>
          <p className={cn("mt-3 font-semibold", inverse && "text-white")}>{i.title}</p>
          <p className={cn("mt-1 text-[15px] leading-relaxed", inverse ? "text-ink-300" : "text-muted")}>{i.body}</p>
        </div>
      ))}
    </div>
  );
}

/* How it works — a real sequence, so it is numbered ------------------------- */
export function HowItWorks() {
  const steps = [
    {
      title: "Choose a service",
      body: "Pick a package and see the exact price before you book. Add extras like an oven clean in one tap.",
    },
    { title: "Pick a time", body: "Choose a two-hour arrival window that suits you. Leave access notes if you won’t be home." },
    {
      title: "We send a vetted pro",
      body: "We match a checked, insured local professional to your job and keep you updated throughout.",
    },
  ];
  return (
    <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
      {steps.map((s, i) => (
        <li key={s.title} className="relative">
          <div className="flex items-center gap-4">
            <span className="tabular grid size-10 shrink-0 place-items-center rounded-full bg-ink-900 text-[15px] font-semibold text-white">
              {i + 1}
            </span>
            {i < steps.length - 1 && <span className="hidden h-px flex-1 bg-line-strong md:block" aria-hidden />}
          </div>
          <h3 className="mt-5 text-xl">{s.title}</h3>
          <p className="mt-2 max-w-sm leading-relaxed text-muted">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

/* Reviews ------------------------------------------------------------------- */
export function ReviewWall({ category }) {
  const list = reviews.filter((r) => r.status === "published" && (!category || r.category === category)).slice(0, 3);
  const shown = list.length ? list : reviews.filter((r) => r.status === "published").slice(0, 3);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {shown.map((r) => (
        <figure key={r.id} className="flex flex-col rounded-2xl border border-line bg-white p-6">
          <Stars value={r.rating} />
          <blockquote className="mt-4 flex-1 text-[17px] leading-relaxed tracking-[-0.005em]">“{r.text}”</blockquote>
          <figcaption className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
            <span>
              <span className="block font-semibold">{r.name}</span>
              <span className="text-muted">{r.suburb}</span>
            </span>
            <span className="rounded-md bg-ink-50 px-2 py-1 text-xs font-medium text-ink-600">
              {getCategory(r.category).name}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/* CTA band ------------------------------------------------------------------ */
export function CtaBand({
  title = "Get it off your list this week.",
  body = "Most services can be booked for the next available day.",
}) {
  return (
    <section className="container-x py-16 sm:py-20">
      <div className="grid overflow-hidden rounded-3xl bg-ink-900 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center px-6 py-12 sm:px-12 sm:py-16">
          <h2 className="text-3xl text-white sm:text-[2.6rem] sm:leading-[1.08]">{title}</h2>
          <p className="mt-4 max-w-md text-lg text-ink-300">{body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/services" variant="accent" size="lg">
              Book a service
            </ButtonLink>
            <ButtonLink href="/contact" variant="inverse" size="lg" className="bg-white/10 text-white hover:bg-white/15">
              Request a quote
            </ButtonLink>
          </div>
        </div>
        <Photo src={images.kitchen} alt="" sizes={900} className="hidden min-h-full md:block" />
      </div>
    </section>
  );
}

/* Inner page hero ------------------------------------------------------------ */
export function PageHero({ title, body, children }) {
  return (
    <section className="border-b border-line bg-paper">
      <div className="container-x py-14 sm:py-20">
        <h1 className="max-w-3xl text-4xl sm:text-[3.25rem] sm:leading-[1.05]">{title}</h1>
        {body && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{body}</p>}
        {children}
      </div>
    </section>
  );
}

export function MoreLink({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[15px] font-semibold text-ink hover:underline hover:underline-offset-4"
    >
      {children} <ArrowUpRight className="size-4" />
    </Link>
  );
}

export { SectionHeading };
