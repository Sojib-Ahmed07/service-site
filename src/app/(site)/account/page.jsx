import Link from "next/link";
import { CalendarDays, MapPin, RotateCcw } from "lucide-react";
import { bookings, categories, demoUser, getCategory, getPackage } from "@/lib/data";
import { formatDate, money } from "@/lib/utils";
import { BookingRow } from "@/components/site/booking-row";
import { CategoryIcon } from "@/components/category-icon";
import { Card, CardHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { BookingBadge } from "@/components/ui/status";

export default function AccountOverviewPage() {
  const mine = bookings.filter((b) => b.customerId === demoUser.id);
  const upcoming = mine
    .filter((b) => !["completed", "cancelled"].includes(b.status))
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = mine.filter((b) => b.status === "completed");
  const next = upcoming[0];
  const rebook = [...new Set(past.map((b) => b.category))].map(getCategory);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Hi, {demoUser.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted">Here’s what’s coming up.</p>
      </div>

      {next ? (
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-ink-800 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <CategoryIcon icon={getCategory(next.category).icon} className="bg-white/10 text-brand-400" />
              <div>
                <p className="text-sm text-ink-300">Next booking</p>
                <p className="font-display text-2xl font-semibold text-white">{getCategory(next.category).name}</p>
                <p className="mt-2 flex items-center gap-2 text-ink-100">
                  <CalendarDays className="size-4" /> {formatDate(next.date, { weekday: "long", day: "numeric", month: "long" })},{" "}
                  {next.slot}
                </p>
                <p className="mt-1 flex items-center gap-2 text-ink-100">
                  <MapPin className="size-4" /> {next.address}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <BookingBadge status={next.status} customer />
              <ButtonLink href={`/account/bookings/${next.id}`} variant="accent">
                View booking
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="font-semibold">No upcoming bookings</p>
          <ButtonLink href="/services" className="mt-4">
            Book a service
          </ButtonLink>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            title="Recent bookings"
            action={
              <Link href="/account/bookings" className="text-sm font-medium text-ink-900">
                See all
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {mine.slice(0, 4).map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Book again" description="Same package, same address." />
          <div className="space-y-1 p-2">
            {(rebook.length ? rebook : categories.slice(0, 3)).map((c) => (
              <Link key={c.slug} href={`/services/${c.slug}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-paper">
                <CategoryIcon icon={c.icon} size="sm" />
                <span className="flex-1 font-medium">{c.name}</span>
                <RotateCcw className="size-4 text-muted" />
              </Link>
            ))}
          </div>
          <div className="border-t border-line px-5 py-4 text-sm text-muted">
            Total spent with us: <span className="font-semibold text-ink">{money(demoUser.spent)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
