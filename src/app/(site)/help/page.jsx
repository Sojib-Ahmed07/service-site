// src/app/(site)/help/page.jsx
import Link from "next/link";
import { CalendarClock, CreditCard, LifeBuoy, Mail, Phone, ShieldCheck } from "lucide-react";
import { getFaqs, getPage, pageMetadata } from "@/server/queries/content";
import { getBookingRules, getBusiness } from "@/server/queries/settings";
import { PageHero } from "@/components/site/sections";
import { PageBody } from "@/components/site/blocks";
import { Accordion } from "@/components/ui/interactive";

/** Header text is edited in Admin › Content › Pages; questions in Admin › Content › FAQs. */
export const generateMetadata = () => pageMetadata("/help");

export default async function HelpPage() {
  const [faqs, paymentFaqs, site, page, rules] = await Promise.all([
    getFaqs("general"),
    getFaqs("payments"),
    getBusiness(),
    getPage("/help"),
    getBookingRules(),
  ]);
  const topics = [
    { icon: <CalendarClock />, title: "Change or cancel a booking", href: "/account/bookings" },
    { icon: <CreditCard />, title: "Payments and refunds", href: "#payments" },
    { icon: <ShieldCheck />, title: `Our ${rules.guaranteeHours}-hour guarantee`, href: "/guarantee" },
    { icon: <LifeBuoy />, title: "Report a problem with a job", href: "/contact?type=complaint" },
  ];
  return (
    <>
      <PageHero title={page.title} body={page.intro} />
      <PageBody blocks={page.blocks} className="pt-14" />
      <section className="container-x py-14">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 hover:border-brand-500"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-50 text-ink-900 [&_svg]:size-5">
                {t.icon}
              </span>
              <span className="font-semibold">{t.title}</span>
            </Link>
          ))}
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="space-y-12">
            {faqs.length > 0 && (
              <div>
                <h2 className="mb-4 text-2xl font-semibold">Bookings</h2>
                <Accordion items={faqs} />
              </div>
            )}
            {paymentFaqs.length > 0 && (
              <div id="payments">
                <h2 className="mb-4 text-2xl font-semibold">Payments</h2>
                <Accordion items={paymentFaqs} />
              </div>
            )}
          </div>
          <aside className="h-fit rounded-[var(--radius-card)] bg-ink-800 p-6 text-white">
            <p className="font-display text-xl font-semibold text-white">Still stuck?</p>
            <p className="mt-2 text-ink-100">
              Our team is in {site.city}, {site.hours}.
            </p>
            <a href={site.phoneHref} className="mt-5 flex items-center gap-3 font-semibold hover:text-brand-400">
              <Phone className="size-4 text-brand-500" /> {site.phone}
            </a>
            <a href={`mailto:${site.email}`} className="mt-3 flex items-center gap-3 font-semibold hover:text-brand-400">
              <Mail className="size-4 text-brand-500" /> {site.email}
            </a>
          </aside>
        </div>
      </section>
    </>
  );
}