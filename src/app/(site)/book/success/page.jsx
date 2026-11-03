import { CalendarCheck, Mail, MessageSquare } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Booking received" };

export default async function BookingSuccessPage({ searchParams }) {
  const { ref = "HD-24818", service = "Your service", date = "", slot = "" } = await searchParams;
  const when = date
    ? `${new Date(date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}${slot ? `, ${slot}` : ""}`
    : "";

  const next = [
    { icon: <Mail />, title: "Confirmation email", body: "A receipt and booking summary are on their way to your inbox." },
    {
      icon: <CalendarCheck />,
      title: "We assign your pro",
      body: "Usually within a few hours. We’ll let you know who’s coming.",
    },
    {
      icon: <MessageSquare />,
      title: "Reminder the day before",
      body: "By SMS, with your arrival window. Reply to us with any changes.",
    },
  ];

  return (
    <section className="container-x py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-ink-900 text-brand-500">
          <CalendarCheck className="size-8" />
        </div>
        <h1 className="mt-6 text-4xl font-semibold sm:text-5xl">You’re booked in.</h1>
        <p className="mt-4 text-lg text-muted">
          {service}
          {when && ` on ${when}`}. Your reference is <span className="font-semibold text-ink">{ref}</span>.
        </p>
      </div>

      <ol className="mx-auto mt-12 grid max-w-4xl gap-3 md:grid-cols-3">
        {next.map((n) => (
          <li key={n.title} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <span className="grid size-10 place-items-center rounded-full bg-ink-50 text-ink-900 [&_svg]:size-5">{n.icon}</span>
            <p className="mt-4 font-semibold">{n.title}</p>
            <p className="mt-1 text-[15px] text-muted">{n.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/account/bookings" size="lg">
          View my bookings
        </ButtonLink>
        <ButtonLink href="/services" variant="outline" size="lg">
          Book something else
        </ButtonLink>
      </div>
    </section>
  );
}
