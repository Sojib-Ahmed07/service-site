"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, Check, Clock, MapPin, Star, StickyNote, UserRoundCheck, X } from "lucide-react";
import { bookingStatus, timeSlots } from "@/lib/data";
import { cn, formatDate, money, money2 } from "@/lib/utils";
import { AdminHeader, ContactButtons } from "@/components/admin/ui";
import { CategoryIcon } from "@/components/category-icon";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal, Switch, useToast } from "@/components/ui/interactive";
import { BookingBadge, PaymentBadge } from "@/components/ui/status";
import { MessageThread } from "@/components/site/booking-actions";

const weekday = (iso) => new Date(iso).toLocaleDateString("en-AU", { weekday: "short", timeZone: "Australia/Hobart" });

export function BookingManager({ booking, category, pkg, extras, customer, zone, candidates, messages }) {
  const { toast, toastNode } = useToast();
  const [status, setStatus] = useState(booking.status);
  const [payment, setPayment] = useState(booking.payment);
  const [providerId, setProviderId] = useState(booking.providerId ?? null);
  const [providerPay, setProviderPay] = useState(booking.providerPay ?? Math.round(booking.total * 0.7));
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [notes, setNotes] = useState([
    { by: "Tom", at: "2 Nov, 6:15pm", text: "Customer prefers a morning call before arrival." },
  ]);
  const [note, setNote] = useState("");

  const assigned = candidates.find((p) => p.id === providerId);
  const margin = booking.total - (assigned ? providerPay : 0);

  const assign = (p) => {
    setProviderId(p.id);
    if (status === "new") setStatus("assigned");
    toast(`Assigned to ${p.name}`);
  };

  const timeline = [
    {
      label: "Booked online",
      at: formatDate(booking.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
      done: true,
    },
    {
      label: "Payment " + (payment === "paid" ? "received" : payment === "partial" ? "deposit received" : "pending"),
      done: payment !== "unpaid",
    },
    { label: assigned ? `Assigned to ${assigned.name}` : "Waiting for a provider", done: !!assigned },
    { label: "Provider confirmed", done: ["confirmed", "in_progress", "completed"].includes(status) },
    { label: "Job completed", done: status === "completed" },
  ];

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/bookings", label: "Bookings" }}
        title={`${booking.id} — ${category.name}`}
        description={`Booked ${formatDate(booking.createdAt, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit details
            </Button>
            {status !== "cancelled" && status !== "completed" && (
              <Button variant="outline" size="sm" className="text-danger" onClick={() => setCancelOpen(true)}>
                Cancel booking
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {/* Status bar */}
          <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <BookingBadge status={status} />
              <PaymentBadge status={payment} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-muted" htmlFor="status">
                Status
              </label>
              <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-44 text-sm">
                {Object.entries(bookingStatus).map(([v, s]) => (
                  <option key={v} value={v}>
                    {s.label}
                  </option>
                ))}
              </Select>
              {status === "assigned" && (
                <Button size="sm" onClick={() => setStatus("confirmed")}>
                  Mark confirmed
                </Button>
              )}
              {status === "confirmed" && (
                <Button size="sm" onClick={() => setStatus("in_progress")}>
                  Start job
                </Button>
              )}
              {status === "in_progress" && (
                <Button size="sm" onClick={() => setStatus("completed")}>
                  Mark completed
                </Button>
              )}
            </div>
          </Card>

          {/* Job details */}
          <Card>
            <CardHeader title="Job" />
            <div className="grid gap-5 p-5 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <CategoryIcon icon={category.icon} />
                <div>
                  <p className="font-semibold">{pkg.name}</p>
                  <p className="text-sm text-muted">
                    {category.name}, {pkg.duration}
                  </p>
                  {extras.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {extras.map((a) => (
                        <Badge key={a.id}>+ {a.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <dl className="space-y-2 text-sm">
                <Line
                  icon={<CalendarDays />}
                  value={formatDate(booking.date, { weekday: "long", day: "numeric", month: "long" })}
                />
                <Line icon={<Clock />} value={booking.slot} />
                <Line icon={<MapPin />} value={`${booking.address} (${zone})`} />
              </dl>
              {booking.notes && (
                <p className="flex gap-3 rounded-xl bg-brand-50/60 p-3 text-sm md:col-span-2">
                  <StickyNote className="mt-0.5 size-4 shrink-0 text-brand-800" />
                  <span>
                    <span className="font-medium">Access notes from customer:</span> {booking.notes}
                  </span>
                </p>
              )}
            </div>
          </Card>

          {/* Assignment */}
          <section id="assign" className="scroll-mt-24">
            {assigned ? (
              <Card className="border-ink-300">
                <CardHeader
                  title="Assigned provider"
                  action={
                    <Button variant="ghost" size="sm" onClick={() => setProviderId(null) || setStatus("new")}>
                      Change provider
                    </Button>
                  }
                />
                <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
                  <div className="flex flex-1 items-center gap-3">
                    <Avatar name={assigned.name} size="lg" />
                    <div>
                      <Link href={`/admin/providers/${assigned.id}`} className="font-semibold hover:underline">
                        {assigned.name}
                      </Link>
                      <p className="text-sm text-muted">{assigned.business}</p>
                      <p className="mt-1 text-sm text-muted">{assigned.phone}</p>
                    </div>
                  </div>
                  <ContactButtons phone={assigned.phone} email={assigned.email} size="md" />
                  <div className="flex items-end gap-3">
                    <Field label="Provider pay" htmlFor="pay" hint={`Rate: ${assigned.rate}`}>
                      <Input
                        id="pay"
                        type="number"
                        value={providerPay}
                        onChange={(e) => setProviderPay(Number(e.target.value))}
                        className="h-10 w-32"
                      />
                    </Field>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
                  <Button size="sm" variant="subtle" onClick={() => toast("Job sheet sent to provider by SMS")}>
                    Send job sheet (SMS)
                  </Button>
                  <Button size="sm" variant="subtle" onClick={() => toast("Customer notified")}>
                    Notify customer
                  </Button>
                </div>
              </Card>
            ) : (
              <AssignPanel booking={booking} zone={zone} candidates={candidates} onAssign={assign} />
            )}
          </section>

          <MessageThread initial={messages} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Customer" action={<ContactButtons phone={customer.phone} email={customer.email} />} />
            <div className="space-y-1 p-5 text-sm">
              <Link href={`/admin/customers/${customer.id}`} className="font-semibold hover:underline">
                {customer.name}
              </Link>
              <p className="text-muted">{customer.email}</p>
              <p className="text-muted">{customer.phone}</p>
              <p className="pt-2 text-muted">
                {customer.bookings} booking{customer.bookings === 1 ? "" : "s"}, {money(customer.spent)} lifetime
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Money" />
            <dl className="space-y-2 p-5 text-sm">
              <Row label={pkg.name} value={money2(pkg.price)} />
              {extras.map((a) => (
                <Row key={a.id} label={a.name} value={money2(a.price)} />
              ))}
              <Row label="Customer pays" value={money2(booking.total)} strong />
              <Row label="Provider pay" value={assigned ? `−${money2(providerPay)}` : "—"} />
              <Row label="Your margin" value={money2(margin)} strong accent />
              <p className="text-xs text-muted">GST collected: {money2(booking.total / 11)}</p>
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
              {payment !== "paid" && (
                <Button size="sm" variant="subtle" onClick={() => setPayment("paid") || toast("Payment recorded")}>
                  Record payment
                </Button>
              )}
              {payment === "paid" && (
                <Button size="sm" variant="ghost" onClick={() => setPayment("refunded") || toast("Refund issued")}>
                  Refund
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => toast("Invoice emailed")}>
                Email invoice
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <ol className="space-y-3 p-5">
              {timeline.map((t) => (
                <li key={t.label} className="flex gap-3 text-sm">
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                      t.done ? "bg-success text-white" : "border-2 border-line-strong",
                    )}
                  >
                    {t.done && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span>
                    <span className={t.done ? "font-medium" : "text-muted"}>{t.label}</span>
                    {t.at && <span className="block text-xs text-muted">{t.at}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Internal notes" description="Only admins see these." />
            <ul className="space-y-3 px-5 pt-4">
              {notes.map((n, i) => (
                <li key={i} className="rounded-xl bg-paper p-3 text-sm ring-1 ring-line">
                  {n.text}
                  <span className="mt-1 block text-xs text-muted">
                    {n.by}, {n.at}
                  </span>
                </li>
              ))}
            </ul>
            <form
              className="space-y-2 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!note.trim()) return;
                setNotes((x) => [...x, { by: "Rachel", at: "Just now", text: note }]);
                setNote("");
              }}
            >
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" className="min-h-20" />
              <Button size="sm" type="submit" variant="outline">
                Add note
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit booking details"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setEditOpen(false) || toast("Booking updated")}>Save changes</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <Input type="date" defaultValue={booking.date} />
          </Field>
          <Field label="Arrival window">
            <Select defaultValue={booking.slot}>
              {timeSlots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input defaultValue={booking.address} />
          </Field>
          <Field label="Price override (total)" hint="Leave as is unless the job scope changed.">
            <Input type="number" defaultValue={booking.total} />
          </Field>
          <Field label="Notify customer">
            <Select>
              <option>Email and SMS</option>
              <option>Email only</option>
              <option>Don’t notify</option>
            </Select>
          </Field>
          <Field label="Access notes" className="sm:col-span-2">
            <Textarea defaultValue={booking.notes} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancel ${booking.id}?`}
        description="The customer and any assigned provider will be notified."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button variant="danger" onClick={() => setCancelOpen(false) || setStatus("cancelled") || toast("Booking cancelled")}>
              Cancel booking
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Reason">
            <Select>
              <option>Customer request</option>
              <option>No provider available</option>
              <option>Weather</option>
              <option>Duplicate booking</option>
            </Select>
          </Field>
          <Field label="Refund">
            <Select>
              <option>Full refund ({money2(booking.total)})</option>
              <option>Partial refund</option>
              <option>No refund (late cancellation)</option>
            </Select>
          </Field>
        </div>
      </Modal>
      {toastNode}
    </>
  );
}

/**
 * The middleman's core tool: find who can do this job.
 * Filters providers who have the skill by zone, availability on the day, status and compliance.
 */
function AssignPanel({ booking, zone, candidates, onAssign }) {
  const day = weekday(booking.date);
  const [onlyZone, setOnlyZone] = useState(true);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return candidates
      .map((p) => ({
        ...p,
        inZone: p.zones.includes(zone),
        available: p.availability.includes(day),
        compliant: p.docs.abn && p.docs.insurance && p.docs.policeCheck && p.docs.licence !== false,
      }))
      .filter((p) => (!onlyZone || p.inZone) && (!onlyAvailable || p.available) && (!onlyActive || p.status === "active"))
      .filter((p) => !t || `${p.name} ${p.business}`.toLowerCase().includes(t))
      .sort(
        (a, b) =>
          Number(b.inZone) + Number(b.available) - (Number(a.inZone) + Number(a.available)) ||
          a.jobsThatDay - b.jobsThatDay ||
          b.rating - a.rating,
      );
  }, [candidates, zone, day, onlyZone, onlyAvailable, onlyActive, q]);

  return (
    <Card className="border-brand-400">
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-sans text-[15px] font-semibold tracking-normal">
              <UserRoundCheck className="size-4 text-brand-600" /> Find a provider
            </h3>
            <p className="mt-0.5 text-sm text-muted">
              {candidates.length} providers offer {booking.category.replace(/-/g, " ")}. Job is in {zone} on {day}.
            </p>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name"
            className="h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-500"
            aria-label="Search providers"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Toggle label={`Covers ${zone}`} checked={onlyZone} onChange={setOnlyZone} />
          <Toggle label={`Works on ${day}`} checked={onlyAvailable} onChange={setOnlyAvailable} />
          <Toggle label="Active only" checked={onlyActive} onChange={setOnlyActive} />
        </div>
      </div>

      {list.length ? (
        <ul className="divide-y divide-line">
          {list.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
              <div className="flex flex-1 items-center gap-3">
                <Avatar name={p.name} />
                <div className="min-w-0">
                  <p className="font-semibold">
                    <Link href={`/admin/providers/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>{" "}
                    <span className="font-normal text-muted">{p.business}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Star className="size-3 fill-star text-star" /> {p.rating}
                    </span>
                    <span>{p.jobs} jobs</span>
                    <span>{p.rate}</span>
                    <span>
                      {p.jobsThatDay ? `${p.jobsThatDay} other job${p.jobsThatDay > 1 ? "s" : ""} that day` : "Free that day"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Match ok={p.inZone} label="Zone" />
                    <Match ok={p.available} label={day} />
                    <Match ok={p.compliant} label="Docs" />
                    {p.status !== "active" && <Badge tone="warn">{p.status}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ContactButtons phone={p.phone} email={p.email} />
                <Button size="sm" onClick={() => onAssign(p)} disabled={p.status !== "active"}>
                  Assign
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-5 py-10 text-center">
          <p className="font-semibold">Nobody matches all filters</p>
          <p className="mt-1 text-sm text-muted">
            Turn off a filter to see providers outside the zone or not usually working on {day}.
          </p>
        </div>
      )}
    </Card>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2">
      <Switch checked={checked} onChange={onChange} label={label} />
      {label}
    </label>
  );
}

function Match({ ok, label }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
        ok ? "bg-ink-50 text-ink-900" : "bg-danger-50 text-danger",
      )}
    >
      {ok ? <BadgeCheck className="size-3" /> : <X className="size-3" />} {label}
    </span>
  );
}

function Line({ icon, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted [&_svg]:size-4">{icon}</span>
      <dd>{value}</dd>
    </div>
  );
}

function Row({ label, value, strong, accent }) {
  return (
    <div className={cn("flex justify-between gap-4", strong && "border-t border-line pt-2 font-semibold")}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className={accent ? "text-ink-900" : ""}>{value}</dd>
    </div>
  );
}
