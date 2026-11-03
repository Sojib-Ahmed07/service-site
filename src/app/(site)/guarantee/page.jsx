import { CtaBand, PageHero } from "@/components/site/sections";

export const metadata = { title: "Our guarantee" };

const steps = [
  {
    title: "Tell us within 48 hours",
    body: "Reply to your confirmation email, call us or use “Report a problem” on your booking. Photos help.",
  },
  {
    title: "We review it the same day",
    body: "Our team looks at the job notes and photos, and calls you if we need more detail.",
  },
  {
    title: "We send someone back, free",
    body: "A pro returns to fix the areas that weren’t right — usually within two business days.",
  },
  { title: "Or we refund that part", body: "If it still can’t be put right, we refund the affected part of the job." },
];

export default function GuaranteePage() {
  return (
    <>
      <PageHero
        title="The Sorted guarantee"
        body="If a job isn’t done to the standard you booked, we put it right. No arguments, no fine print hunting."
      />
      <section className="container-x py-16">
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <span className="font-display text-4xl font-semibold text-ink-300">{i + 1}</span>
              <p className="mt-4 text-lg font-semibold">{s.title}</p>
              <p className="mt-2 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 max-w-3xl space-y-3 text-muted">
          <h2 className="font-sans text-lg font-semibold tracking-normal text-ink">What’s covered</h2>
          <p>
            Workmanship on the tasks listed in your package and any extras you added. End of lease cleans have an extended 72-hour
            window for agent reports.
          </p>
          <p>Damage is covered separately by our pros’ public liability insurance; we’ll manage that claim for you.</p>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
