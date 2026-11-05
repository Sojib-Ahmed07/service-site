// src/app/(site)/contact/page.jsx
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getBusiness } from "@/server/queries/settings";
import { getPage, pageMetadata } from "@/server/queries/content";
import { PageHero } from "@/components/site/sections";
import { PageBody } from "@/components/site/blocks";
import { ContactForm } from "@/components/site/forms";

/** Header text is edited in Admin › Content › Pages. */
export const generateMetadata = () => pageMetadata("/contact");

export default async function ContactPage({ searchParams }) {
  const { type } = await searchParams;
  const [site, page] = await Promise.all([getBusiness(), getPage("/contact")]);
  const details = [
    { icon: <Phone />, label: "Call", value: site.phone, href: site.phoneHref },
    { icon: <Mail />, label: "Email", value: site.email, href: `mailto:${site.email}` },
    { icon: <MapPin />, label: "Office", value: site.address },
    { icon: <Clock />, label: "Hours", value: site.hours },
  ];
  return (
    <>
      <PageHero title={page.title} body={page.intro} />
      <PageBody blocks={page.blocks} className="pt-14" />
      <section className="container-x grid gap-10 py-14 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-8">
          <ContactForm defaultType={type === "complaint" ? "Complaint" : "General"} />
        </div>
        <ul className="space-y-3">
          {details.map((d) => (
            <li key={d.label} className="flex items-start gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-50 text-ink-900 [&_svg]:size-5">
                {d.icon}
              </span>
              <span>
                <span className="block text-sm text-muted">{d.label}</span>
                {d.href ? (
                  <a href={d.href} className="font-semibold hover:text-ink-900">
                    {d.value}
                  </a>
                ) : (
                  <span className="font-semibold">{d.value}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}