import Link from "next/link";
import { CalendarClock, CreditCard, LifeBuoy, Mail, Phone, ShieldCheck } from "lucide-react";
import { faqs } from "@/lib/data";
import { site } from "@/lib/site";
import { PageHero } from "@/components/site/sections";
import { Accordion } from "@/components/ui/interactive";

export const metadata = { title: "Help centre" };

const topics = [
  { icon: <CalendarClock />, title: "Change or cancel a booking", href: "/account/bookings" },
  { icon: <CreditCard />, title: "Payments and refunds", href: "#payments" },
  { icon: <ShieldCheck />, title: "Our 48-hour guarantee", href: "/guarantee" },
  { icon: <LifeBuoy />, title: "Report a problem with a job", href: "/contact?type=complaint" },
];

const paymentFaqs = [
  {
    q: "When am I charged?",
    a: "If you pay by card, the amount is authorised at booking and charged once the job is complete. If you choose to pay after the job, we email an invoice due within 7 days.",
  },
  { q: "How do refunds work?", a: "Approved refunds go back to the original payment method within 5–10 business days." },
  { q: "Do I get a tax invoice?", a: "Yes. Every booking has a GST tax invoice you can download from your account." },
];

export default function HelpPage() {
  return (
    <>
      <PageHero title="How can we help?" body="Answers to common questions, or get in touch with our Hobart team." />
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
            <div>
              <h2 className="mb-4 text-2xl font-semibold">Bookings</h2>
              <Accordion items={faqs} />
            </div>
            <div id="payments">
              <h2 className="mb-4 text-2xl font-semibold">Payments</h2>
              <Accordion items={paymentFaqs} />
            </div>
          </div>
          <aside className="h-fit rounded-[var(--radius-card)] bg-ink-800 p-6 text-white">
            <p className="font-display text-xl font-semibold text-white">Still stuck?</p>
            <p className="mt-2 text-ink-100">Our team is in Hobart, {site.hours}.</p>
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
