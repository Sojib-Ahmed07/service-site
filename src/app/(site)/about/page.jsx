import { CtaBand, PageHero, TrustStrip } from "@/components/site/sections";

export const metadata = { title: "About us" };

const figures = [
  { value: "12", label: "services, one booking flow" },
  { value: "26", label: "suburbs across Greater Hobart" },
  { value: "48 hrs", label: "to report a problem — we fix it free" },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="A Hobart business, looking after Hobart homes"
        body="Sorted started with a simple idea: booking a cleaner or a pest treatment should be as easy as ordering takeaway, and someone should be accountable for the result."
      />
      <section className="container-x grid gap-12 py-16 lg:grid-cols-2">
        <div className="space-y-5 text-lg leading-relaxed text-muted">
          <p>
            Finding reliable help in Hobart usually means ringing around, waiting on quotes and hoping whoever turns up is
            insured. We do that work once, properly, so you don’t have to.
          </p>
          <p>
            We partner with independent local cleaners, technicians and tradespeople, check their credentials, agree fair fixed
            prices, and handle all the scheduling. You book with us, pay us, and talk to us. Our pros get steady work without
            chasing invoices.
          </p>
          <p>Everything is run from our office on Murray Street, by people who live here.</p>
        </div>
        <dl className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-3 lg:grid-cols-1">
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
