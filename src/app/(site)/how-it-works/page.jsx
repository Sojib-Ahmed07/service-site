import { BadgeCheck, FileCheck2, ShieldCheck, UserCheck } from "lucide-react";
import { CtaBand, HowItWorks, PageHero, TrustStrip } from "@/components/site/sections";

export const metadata = { title: "How it works" };

const vetting = [
  {
    icon: <FileCheck2 />,
    title: "ABN and insurance",
    body: "Every pro holds an active ABN and at least $10m public liability cover. We keep copies on file and check expiry dates.",
  },
  { icon: <UserCheck />, title: "National police check", body: "Completed before their first job, and renewed every two years." },
  {
    icon: <BadgeCheck />,
    title: "Trade licences",
    body: "Electricians, plumbers and pest technicians must hold a current Tasmanian licence for their trade.",
  },
  {
    icon: <ShieldCheck />,
    title: "Ongoing ratings",
    body: "Every job is rated. Pros who fall below our standard stop receiving work.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="How Sorted works"
        body="You book with us, we send a vetted local pro, and we stay responsible for the job from start to finish."
      />
      <section className="container-x py-16">
        <HowItWorks />
      </section>
      <section className="border-y border-line bg-surface py-16">
        <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-semibold">How we choose our pros</h2>
            <p className="mt-3 text-lg text-muted">
              Fewer than one in four applicants make it onto our team. Here’s what every one of them has passed.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {vetting.map((v) => (
              <div key={v.title} className="rounded-[var(--radius-card)] border border-line p-5">
                <span className="grid size-10 place-items-center rounded-full bg-ink-50 text-ink-900 [&_svg]:size-5">
                  {v.icon}
                </span>
                <p className="mt-4 font-semibold">{v.title}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container-x py-14">
        <TrustStrip />
      </section>
      <CtaBand />
    </>
  );
}
