// src/components/site/footer.jsx
import Link from "next/link";
import { Logo } from "./logo";

const company = [
  { href: "/about", label: "About us" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/guarantee", label: "Our guarantee" },
  { href: "/blog", label: "Home care guides" },
  { href: "/partners", label: "Become a partner" },
];
const help = [
  { href: "/help", label: "Help centre" },
  { href: "/areas", label: "Areas we cover" },
  { href: "/account/bookings", label: "Manage a booking" },
  { href: "/contact", label: "Contact us" },
];

/** categories and business come from the database via app/(site)/layout.jsx */
export function SiteFooter({ categories = [], business }) {
  const site = business;
  return (
    <footer className="bg-ink-950 text-ink-300">
      <div className="container-x grid gap-12 pb-12 pt-16 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-xs">
          <Logo inverse name={site.name} />
          <p className="mt-4 text-[15px] leading-relaxed">
            Fixed-price home services across {site.region}, booked online and looked after by one local team.
          </p>
          <div className="mt-6 space-y-1 text-[15px]">
            <a href={site.phoneHref} className="block font-semibold text-white hover:text-brand-400">
              {site.phone}
            </a>
            <a href={`mailto:${site.email}`} className="block hover:text-white">
              {site.email}
            </a>
            <p>{site.hours}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <FooterCol
            title="Services"
            links={categories.slice(0, 7).map((c) => ({ href: `/services/${c.slug}`, label: c.name }))}
          />
          <FooterCol title="Company" links={company} />
          <FooterCol title="Support" links={help} />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-[13px] text-ink-400 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name} Home Services. ABN {site.abn}. {site.address}.
          </p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-white">{title}</p>
      <ul className="space-y-2.5 text-[15px]">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}