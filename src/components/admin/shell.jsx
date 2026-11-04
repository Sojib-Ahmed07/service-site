// src/components/admin/shell.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarRange,
  ExternalLink,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  MessageSquareQuote,
  Package,
  Search,
  Settings,
  Tag,
  UsersRound,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/server/actions/auth";
import { LogoMark } from "@/components/site/logo";
import { Avatar } from "@/components/ui/misc";

/** Sidebar links. Counts come from the database (app/admin/layout.jsx). */
const buildNav = ({ newBookings = 0, openInbox = 0, pendingReviews = 0 } = {}) => [
  { items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Operations",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: CalendarRange, count: newBookings },
      { href: "/admin/providers", label: "Providers", icon: Wrench },
      { href: "/admin/customers", label: "Customers", icon: UsersRound },
      { href: "/admin/inbox", label: "Inbox", icon: Inbox, count: openInbox },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/services", label: "Services & pricing", icon: Package },
      { href: "/admin/areas", label: "Service areas", icon: MapPinned },
      { href: "/admin/coupons", label: "Promo codes", icon: Tag },
    ],
  },
  {
    title: "Money",
    items: [{ href: "/admin/payments", label: "Payments & payouts", icon: Wallet }],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/cms", label: "Content (CMS)", icon: FileText },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote, count: pendingReviews },
    ],
  },
  { items: [{ href: "/admin/settings", label: "Settings", icon: Settings }] },
];

function SidebarContent({ path, counts, businessName }) {
  const nav = buildNav(counts);
  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex h-16 shrink-0 items-center gap-2 px-5">
        <LogoMark className="size-7" />
        <span className="text-[19px] font-semibold tracking-[-0.04em]">{businessName.toLowerCase()}</span>
        <span className="ml-1 rounded-md bg-ink-50 px-1.5 py-0.5 text-[11px] font-medium text-muted ring-1 ring-inset ring-line">
          Admin
        </span>
      </Link>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
        {nav.map((group, gi) => (
          <div key={gi}>
            {group.title && <p className="mb-1 px-2.5 text-xs font-medium text-subtle">{group.title}</p>}
            <ul className="space-y-px">
              {group.items.map(({ href, label, icon: Icon, count }) => {
                const active = href === "/admin" ? path === href : path.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-sm font-medium transition-colors",
                        active ? "bg-ink-50 text-ink ring-1 ring-inset ring-line" : "text-ink-600 hover:bg-ink-50 hover:text-ink",
                      )}
                    >
                      <Icon className={cn("size-4", active ? "text-brand-600" : "text-ink-400")} />
                      <span className="flex-1">{label}</span>
                      {count > 0 && (
                        <span className="tabular rounded-md bg-brand-50 px-1.5 text-[11px] font-semibold leading-5 text-brand-700">
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink"
        >
          <ExternalLink className="size-4 text-ink-400" /> View website
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink"
          >
            <LogOut className="size-4 text-ink-400" /> Log out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminShell({ children, user, counts, businessName = "Sorted" }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="min-h-dvh bg-[#f7f8fa]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-white lg:block">
        <SidebarContent path={path} counts={counts} businessName={businessName} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-full p-2 text-muted hover:text-ink"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            <SidebarContent path={path} counts={counts} businessName={businessName} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button onClick={() => setOpen(true)} className="-ml-1 rounded-lg p-2 hover:bg-paper lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <label className="flex h-10 max-w-md flex-1 items-center gap-2 rounded-lg border border-line bg-ink-50 px-3 text-sm">
            <Search className="size-4 text-muted" />
            <span className="sr-only">Search</span>
            <input
              placeholder="Search bookings, customers, providers…"
              className="w-full bg-transparent outline-none placeholder:text-subtle"
            />
            <kbd className="hidden rounded border border-line bg-surface px-1.5 text-[11px] text-muted sm:block">/</kbd>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button className="relative rounded-lg p-2 hover:bg-paper" aria-label="Notifications">
              <Bell className="size-5" />
              {(counts?.newBookings ?? 0) + (counts?.openInbox ?? 0) > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" />
              )}
            </button>
            <div className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2">
              <Avatar name={user.name} size="sm" />
              <span className="hidden text-sm font-medium sm:block">{user.name.split(" ")[0]}</span>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}