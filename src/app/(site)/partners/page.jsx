// src/app/(site)/partners/page.jsx
import { CalendarCheck2, Receipt, Wrench } from "lucide-react";
import { PageHero } from "@/components/site/sections";
import { PartnerForm } from "@/components/site/forms";
import { getAreas, getCategories } from "@/server/queries/catalog";
import { getBusiness } from "@/server/queries/settings";

export const metadata = { title: "Work with us" };

const perks = [
  {
    icon: <CalendarCheck2 />,
    title: "Steady, scheduled work",
    body: "We send you confirmed jobs in your zones, on the days you choose.",
  },
  {
    icon: <Receipt />,
    title: "Paid weekly, no chasing",
    body: "We collect from the customer. You’re paid every Friday for completed jobs.",
  },
  {
    icon: <Wrench />,
    title: "You focus on the work",
    body: "No quoting, no marketing, no admin. We handle the customer from start to finish.",
  },
];

export default async function PartnersPage() {
  const [categories, { zones }, business] = await Promise.all([getCategories(), getAreas(), getBusiness()]);
  return (
    <>
      <PageHero
        title={`Work with ${business.name}`}
        body={`We’re looking for reliable, insured cleaners, technicians and tradespeople across ${business.region}.`}
      />
      <section className="container-x py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {perks.map((p) => (
            <div key={p.title} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-800 [&_svg]:size-5">
                {p.icon}
              </span>
              <p className="mt-4 text-lg font-semibold">{p.title}</p>
              <p className="mt-1 text-muted">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-10">
          <h2 className="text-2xl font-semibold">Apply to join</h2>
          <p className="mb-8 mt-1 text-muted">Takes about three minutes.</p>
          <PartnerForm categories={categories} zones={zones} />
        </div>
      </section>
    </>
  );
}