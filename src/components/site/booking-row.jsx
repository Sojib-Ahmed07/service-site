// src/components/site/booking-row.jsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatISODate } from "@/lib/dates";
import { money } from "@/lib/utils";
import { CategoryIcon } from "@/components/category-icon";
import { BookingBadge } from "@/components/ui/status";

/** A customer's booking as a tappable row. `b` comes from getMyBookings(). */
export function BookingRow({ b }) {
  return (
    <Link href={`/account/bookings/${b.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper/70">
      <CategoryIcon icon={b.icon} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-semibold">{b.categoryName}</p>
          <BookingBadge status={b.status} customer />
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">
          {b.packageName}, {formatISODate(b.date, { weekday: "short", day: "numeric", month: "short" })}, {b.slot}
        </p>
      </div>
      <p className="hidden font-semibold sm:block">{money(b.total)}</p>
      <ChevronRight className="size-4 text-subtle" />
    </Link>
  );
}