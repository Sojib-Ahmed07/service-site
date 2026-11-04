// src/components/site/account-nav.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, LogOut, MapPin, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/server/actions/auth";

const items = [
  { href: "/account", label: "Overview", icon: Home },
  { href: "/account/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile & security", icon: UserRound },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/account" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3.5 py-2.5 text-[15px] font-medium transition-colors",
              active ? "bg-ink-900 text-white" : "text-muted hover:bg-surface hover:text-ink",
            )}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
      <form action={signOut} className="shrink-0 lg:mt-4">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-medium text-muted hover:text-ink lg:rounded-xl"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </form>
    </nav>
  );
}