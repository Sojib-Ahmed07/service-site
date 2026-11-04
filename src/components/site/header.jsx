// src/components/site/header.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { serviceGroups } from "@/lib/constants";
import { cn, money } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { Logo } from "./logo";

const nav = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/areas", label: "Areas" },
  { href: "/offers", label: "Offers" },
  { href: "/help", label: "Help" },
];

/** categories and business come from the database via app/(site)/layout.jsx */
export function SiteHeader({ announcement, categories = [], business, user = null }) {
  const site = business;
  const account = user
    ? { href: user.role === "admin" ? "/admin" : "/account", label: user.role === "admin" ? "Admin" : "My account" }
    : { href: "/login", label: "Log in" };
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMega(false);
    setMobile(false);
  }, [pathname]);

  const groups = serviceGroups.filter((g) => categories.some((c) => c.group === g));
  const featured = categories.find((c) => c.slug === "end-of-lease-cleaning");

  return (
    <header className="sticky top-0 z-40">
      {announcement && (
        <Link
          href={announcement.link}
          className="block bg-ink-900 px-4 py-2 text-center text-[13px] text-ink-100 hover:text-white"
        >
          {announcement.text}
        </Link>
      )}
      <div className="border-b border-line bg-white/95 backdrop-blur-md">
        <div className="container-x flex h-[68px] items-center gap-8">
          <Logo name={site.name} />

          <nav className="hidden items-center gap-0.5 lg:flex" onMouseLeave={() => setMega(false)}>
            <button
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-2 text-[15px] font-medium text-ink-700 hover:text-ink",
                mega && "text-ink",
              )}
              onMouseEnter={() => setMega(true)}
              onClick={() => setMega((v) => !v)}
              aria-expanded={mega}
            >
              Services <ChevronDown className={cn("size-4 transition-transform", mega && "rotate-180")} />
            </button>
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-[15px] font-medium text-ink-700 hover:text-ink",
                  pathname === n.href && "text-ink",
                )}
              >
                {n.label}
              </Link>
            ))}

            {mega && (
              <div className="absolute inset-x-0 top-full border-b border-line bg-white shadow-[var(--shadow-lift)]">
                <div className="container-x grid grid-cols-[1fr_1fr_1fr_1fr_280px] gap-8 py-8">
                  {groups.map((g) => (
                    <div key={g}>
                      <p className="mb-3 text-[13px] font-medium text-subtle">{g}</p>
                      <ul className="space-y-0.5">
                        {categories
                          .filter((c) => c.group === g)
                          .map((c) => (
                            <li key={c.slug}>
                              <Link
                                href={`/services/${c.slug}`}
                                className="group -mx-2 flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-ink-50"
                              >
                                <span className="text-[15px] font-medium">{c.name}</span>
                                <span className="tabular text-xs text-subtle group-hover:text-muted">
                                  {money(c.fromPrice)}
                                  {c.priceUnit ?? ""}
                                </span>
                              </Link>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                  {featured ? (
                    <Link href={`/services/${featured.slug}`} className="group overflow-hidden rounded-2xl bg-ink-50">
                      <Photo src={featured.image} alt="" sizes={600} className="aspect-[16/10]" />
                      <div className="p-4">
                        <p className="text-sm font-semibold">Moving out this month?</p>
                        <p className="mt-0.5 text-sm text-muted">{featured.short}</p>
                      </div>
                    </Link>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <a
              href={site.phoneHref}
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-medium text-ink-700 hover:text-ink xl:flex"
            >
              <Phone className="size-4" /> {site.phone}
            </a>
            <Link
              href={account.href}
              className="hidden rounded-lg px-3 py-2 text-[15px] font-medium text-ink-700 hover:text-ink sm:block"
            >
              {account.label}
            </Link>
            <ButtonLink href="/services" variant="accent" className="hidden sm:inline-flex">
              Book a service
            </ButtonLink>
            <button
              className="-mr-2 rounded-lg p-2 hover:bg-ink-50 lg:hidden"
              onClick={() => setMobile(true)}
              aria-label="Open menu"
            >
              <Menu className="size-6" />
            </button>
          </div>
        </div>
      </div>

      {mobile && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden">
          <div className="container-x flex h-[68px] items-center justify-between border-b border-line">
            <Logo name={site.name} />
            <button className="-mr-2 rounded-lg p-2 hover:bg-ink-50" onClick={() => setMobile(false)} aria-label="Close menu">
              <X className="size-6" />
            </button>
          </div>
          <div className="container-x h-[calc(100dvh-68px)] overflow-y-auto pb-10 pt-6">
            <p className="mb-3 text-[13px] font-medium text-subtle">Services</p>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/services/${c.slug}`}
                  className="flex items-center gap-2.5 rounded-xl border border-line p-2 text-sm font-medium"
                >
                  <Photo src={c.image} sizes={120} className="size-9 shrink-0 rounded-lg" />
                  <span className="leading-tight">{c.name}</span>
                </Link>
              ))}
            </div>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {[...nav, account].map((n) => (
                <Link key={n.href} href={n.href} className="block py-4 text-lg font-medium">
                  {n.label}
                </Link>
              ))}
            </div>
            <ButtonLink href="/services" variant="accent" size="lg" className="mt-6 w-full">
              Book a service
            </ButtonLink>
            <a href={site.phoneHref} className="mt-3 flex items-center justify-center gap-2 py-3 font-medium">
              <Phone className="size-4" /> Call {site.phone}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}