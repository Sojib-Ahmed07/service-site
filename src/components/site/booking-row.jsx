import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCategory, getPackage } from "@/lib/data";
import { formatDate, money } from "@/lib/utils";
import { CategoryIcon } from "@/components/category-icon";
import { BookingBadge } from "@/components/ui/status";

/** A customer's booking as a tappable row. */
export function BookingRow({ b }) {
  const c = getCategory(b.category);
  const p = getPackage(b.packageId);
  return (
    <Link href={`/account/bookings/${b.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper/70">
      <CategoryIcon icon={c.icon} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-semibold">{c.name}</p>
          <BookingBadge status={b.status} customer />
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">
          {p.name}, {formatDate(b.date)}, {b.slot}
        </p>
      </div>
      <p className="hidden font-semibold sm:block">{money(b.total)}</p>
      <ChevronRight className="size-4 text-subtle" />
    </Link>
  );
}
