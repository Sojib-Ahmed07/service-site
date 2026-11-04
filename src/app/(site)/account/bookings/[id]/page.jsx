// src/app/(site)/account/bookings/[id]/page.jsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, KeyRound, MapPin } from "lucide-react";
import { bookingStatus, bookingSteps } from "@/lib/constants";
import { formatISODate } from "@/lib/dates";
import { cn, money2 } from "@/lib/utils";
import { requireUser } from "@/server/session";
import { getMyBooking } from "@/server/queries/account";
import { getBookingRules } from "@/server/queries/settings";
import { CategoryIcon } from "@/components/category-icon";
import { Card, CardHeader } from "@/components/ui/misc";
import { BookingBadge, PaymentBadge } from "@/components/ui/status";
import { BookingActions, MessageThread } from "@/components/site/booking-actions";

export const metadata = { title: "Booking" };

export default async function MyBookingDetailPage({ params }) {
  const { id } = await params;
  const user = await requireUser(`/account/bookings/${id}`);
  const [b, rules] = await Promise.all([getMyBooking(user.id, id), getBookingRules()]);
  if (!b) notFound();
  const c = { name: b.categoryName, icon: b.icon };
  const p = { name: b.packageName, price: b.packagePrice };
  const extras = b.extras;
  const currentIndex = bookingSteps.indexOf(b.status);
  const cancelled = b.status === "cancelled";
  const canChange = ["new", "assigned", "confirmed"].includes(b.status);

  return (
    <div className="space-y-6">
      <Link href="/account/bookings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All bookings
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <CategoryIcon icon={c.icon} size="lg" />
          <div>
            <p className="text-sm text-muted">Booking {b.id}</p>
            <h1 className="text-3xl font-semibold">{c.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <BookingBadge status={b.status} customer />
              <PaymentBadge status={b.payment} />
            </div>
          </div>
        </div>
        <BookingActions canChange={canChange} completed={b.status === "completed"} timeSlots={rules.timeSlots} />
      </div>

      {/* Progress timeline */}
      {!cancelled && (
        <Card className="p-5 sm:p-6">
          <ol className="grid gap-4 sm:grid-cols-5 sm:gap-2">
            {bookingSteps.map((s, i) => {
              const done = i <= currentIndex;
              return (
                <li key={s} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
                  <span className={cn("h-1.5 w-10 rounded-full sm:w-full", done ? "bg-brand-600" : "bg-line")} />
                  <span className={cn("text-sm", i === currentIndex ? "font-semibold" : done ? "text-ink" : "text-muted")}>
                    {bookingStatus[s].customerLabel}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <dl className="grid gap-5 p-5 sm:grid-cols-2">
              <Detail
                icon={<CalendarDays />}
                label="Date"
                value={formatISODate(b.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              />
              <Detail icon={<Clock />} label="Arrival window" value={b.slot} />
              <Detail icon={<MapPin />} label="Address" value={b.address} />
              <Detail icon={<KeyRound />} label="Access notes" value={b.notes || "None added"} />
            </dl>
            {b.hasProvider && (
              <p className="border-t border-line px-5 py-4 text-sm text-muted">
                A vetted Sorted pro has been assigned. For any changes, message us below — we’ll pass it on.
              </p>
            )}
          </Card>

          <MessageThread bookingRef={b.id} initial={b.messages} />
        </div>

        <Card className="h-fit">
          <CardHeader title="Payment" />
          <dl className="space-y-2 p-5 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted">{p.name}</dt>
              <dd>{money2(p.price)}</dd>
            </div>
            {extras.map((a) => (
              <div key={a.id} className="flex justify-between">
                <dt className="text-muted">{a.name}</dt>
                <dd>{money2(a.price)}</dd>
              </div>
            ))}
            {b.surcharge > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Travel fee</dt>
                <dd>{money2(b.surcharge)}</dd>
              </div>
            )}
            {b.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Promo{b.couponCode ? ` ${b.couponCode}` : ""}</dt>
                <dd>−{money2(b.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-3 font-semibold">
              <dt>Total</dt>
              <dd>{money2(b.total)}</dd>
            </div>
            <p className="text-xs text-muted">Includes {money2(b.total / 11)} GST</p>
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Detail({ icon, label, value }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-brand-600 [&_svg]:size-4">{icon}</span>
      <div>
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="mt-0.5 font-medium">{value}</dd>
      </div>
    </div>
  );
}