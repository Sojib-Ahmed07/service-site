// src/app/(site)/account/page.jsx
import Link from "next/link";
import { CalendarDays, MapPin, RotateCcw } from "lucide-react";
import { formatISODate } from "@/lib/dates";
import { money } from "@/lib/utils";
import { requireUser } from "@/server/session";
import { getMyBookings, getMySpend, splitBookings } from "@/server/queries/account";
import { getCategories } from "@/server/queries/catalog";
import { BookingRow } from "@/components/site/booking-row";
import { CategoryIcon } from "@/components/category-icon";
import { Card, CardHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { BookingBadge } from "@/components/ui/status";

export default async function AccountOverviewPage() {
  const user = await requireUser("/account");
  const [mine, spent, categories] = await Promise.all([getMyBookings(user.id), getMySpend(user.id), getCategories()]);
  const { upcoming } = splitBookings(mine);
  const next = upcoming[0];
  const completedSlugs = [...new Set(mine.filter((b) => b.status === "completed").map((b) => b.category))];
  const rebook = completedSlugs.map((s) => categories.find((c) => c.slug === s)).filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Hi, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted">Here’s what’s coming up.</p>
      </div>

      {next ? (
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-ink-800 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <CategoryIcon icon={next.icon} className="bg-white/10 text-brand-400" />
              <div>
                <p className="text-sm text-ink-300">Next booking</p>
                <p className="font-display text-2xl font-semibold text-white">{next.categoryName}</p>
                <p className="mt-2 flex items-center gap-2 text-ink-100">
                  <CalendarDays className="size-4" /> {formatISODate(next.date)}, {next.slot}
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

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader
            title="Recent bookings"
            action={
              <Link href="/account/bookings" className="text-sm font-medium text-ink-900">
                See all
              </Link>
            }
          />
          {mine.length ? (
            <div className="divide-y divide-line">
              {mine.slice(0, 4).map((b) => (
                <BookingRow key={b.id} b={b} />
              ))}
            </div>
          ) : (
            <p className="px-5 py-6 text-sm text-muted">Your bookings will show here.</p>
          )}
        </Card>

        <Card>
          <CardHeader
            title={rebook.length ? "Book again" : "Popular services"}
            description={rebook.length ? "Services you’ve booked before." : "Most booked this month."}
          />
          <div className="space-y-1 p-2">
            {(rebook.length ? rebook : categories.filter((c) => c.popular).slice(0, 3)).map((c) => (
              <Link key={c.slug} href={`/services/${c.slug}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-paper">
                <CategoryIcon icon={c.icon} size="sm" />
                <span className="flex-1 font-medium">{c.name}</span>
                <RotateCcw className="size-4 text-muted" />
              </Link>
            ))}
          </div>
          <div className="border-t border-line px-5 py-4 text-sm text-muted">
            Total spent with us: <span className="font-semibold text-ink">{money(spent)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}