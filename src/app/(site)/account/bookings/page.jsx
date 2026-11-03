import { CalendarDays } from "lucide-react";
import { bookings, demoUser } from "@/lib/data";
import { BookingRow } from "@/components/site/booking-row";
import { Card, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "My bookings" };

export default function MyBookingsPage() {
  const mine = bookings.filter((b) => b.customerId === demoUser.id);
  const upcoming = mine.filter((b) => !["completed", "cancelled"].includes(b.status));
  const past = mine.filter((b) => ["completed", "cancelled"].includes(b.status));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold">Bookings</h1>
        <ButtonLink href="/services">New booking</ButtonLink>
      </div>
      <Section title="Upcoming" list={upcoming} empty="Nothing booked. Pick a service to get started." />
      <Section title="Past" list={past} empty="Completed and cancelled bookings will appear here." />
    </div>
  );
}

function Section({ title, list, empty }) {
  return (
    <section>
      <h2 className="mb-3 font-sans text-lg font-semibold tracking-normal">
        {title} <span className="font-normal text-muted">({list.length})</span>
      </h2>
      <Card className="overflow-hidden">
        {list.length ? (
          <div className="divide-y divide-line">
            {list.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarDays />} title="No bookings" body={empty} />
        )}
      </Card>
    </section>
  );
}
