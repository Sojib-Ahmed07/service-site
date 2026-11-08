// src/components/admin/booking-manager.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BadgeCheck, CalendarDays, Check, Clock, MapPin, Star, StickyNote, UserRoundCheck, X } from "lucide-react";
import { bookingStatus } from "@/lib/constants";
import { formatISODate } from "@/lib/dates";
import { cn, formatDate, money, money2 } from "@/lib/utils";
import {
  addBookingNote,
  adminCancelBooking,
  assignProvider,
  emailInvoice,
  logJobSheetSent,
  notifyCustomerAssigned,
  recordPayment,
  setBookingStatus,
  unassignProvider,
  updateBookingDetails,
  updateProviderPay,
} from "@/server/actions/admin-bookings";
import { AdminHeader, ContactButtons } from "@/components/admin/ui";
import { CategoryIcon } from "@/components/category-icon";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal, Switch, useToast } from "@/components/ui/interactive";
import { BookingBadge, PaymentBadge } from "@/components/ui/status";
import { MessageThread } from "@/components/site/booking-actions";

const payTypeLabel = { per_job: "Per job", hourly: "Hourly", commission: "Commission" };
const stamp = (iso) => formatDate(iso, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Suggested provider pay from their rate: "70% of job" → 70% of the total, "$120 / …" → $120, otherwise 70%. */
function suggestPay(rate, total) {
  const pct = String(rate).match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return Math.round((total * Number(pct[1])) / 100);
  const dollars = String(rate).match(/\$\s*(\d+(?:\.\d+)?)(?!\s*\/\s*hr)/i);
  if (dollars && !/hr|hour/i.test(rate)) return Number(dollars[1]);
  return Math.round(total * 0.7);
}

/** Fills the job sheet SMS template from Settings › Notifications. */
function jobSheet(template, b, pay) {
  const vars = {
    booking_id: b.id,
    service: b.categoryName,
    package: b.packageName,
    date: formatISODate(b.date),
    slot: b.slot,
    address: b.address,
    access_notes: b.notes || "None",
    provider_pay: money2(pay ?? 0),
  };
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export function BookingManager({ data, timeSlots, jobSheetTemplate }) {
  const { booking, extras, customer, assigned, candidates, messages, notes: initialNotes, timeline } = data;
  const router = useRouter();
  const { toast, toastNode } = useToast();
  const [pending, start] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [notes, setNotes] = useState(initialNotes);
  const [note, setNote] = useState("");

  /** Runs a server action, shows the result, refreshes the page data. */
  const run = (fn, success, after) =>
    start(async () => {
      try {
        const res = await fn();
        if (!res.ok) {
          setModalError(res.error);
          toast(res.error);
          return;
        }
        setModalError("");
        after?.(res);
        // `warning` = saved, but an email didn't go out (or was only printed in the terminal).
        if (res.warning || success) toast(res.warning || success);
        router.refresh();
      } catch {
        toast("Something went wrong. Please try again.");
      }
    });

  const status = booking.status;
  const closed = status === "completed" || status === "cancelled";
  const margin = booking.total - (assigned ? (booking.providerPay ?? 0) : 0);
  const smsBody = assigned ? jobSheet(jobSheetTemplate, booking, booking.providerPay) : "";
  const smsHref = assigned ? `sms:${assigned.phone.replace(/\s/g, "")}?&body=${encodeURIComponent(smsBody)}` : "#";

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/bookings", label: "Bookings" }}
        title={`${booking.id} — ${booking.categoryName}`}
        description={`Booked ${formatDate(booking.createdAt, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalError("") || setEditOpen(true)} disabled={pending}>
              Edit details
            </Button>
            {!closed && (
              <Button
                variant="outline"
                size="sm"
                className="text-danger"
                onClick={() => setModalError("") || setCancelOpen(true)}
                disabled={pending}
              >
                Cancel booking
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {/* Status bar */}
          <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <BookingBadge status={status} />
              <PaymentBadge status={booking.payment} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-muted" htmlFor="status">
                Status
              </label>
              <Select
                id="status"
                value={status}
                disabled={pending || status === "cancelled"}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === "cancelled") return setCancelOpen(true);
                  run(() => setBookingStatus(booking.id, next), `Marked ${bookingStatus[next].label.toLowerCase()}`);
                }}
                className="h-9 w-44 text-sm"
              >
                {Object.entries(bookingStatus).map(([v, s]) => (
                  <option key={v} value={v}>
                    {s.label}
                  </option>
                ))}
              </Select>
              {status === "assigned" && (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => setBookingStatus(booking.id, "confirmed"), "Marked confirmed")}
                >
                  Mark confirmed
                </Button>
              )}
              {status === "confirmed" && (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => setBookingStatus(booking.id, "in_progress"), "Job started")}
                >
                  Start job
                </Button>
              )}
              {status === "in_progress" && (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => setBookingStatus(booking.id, "completed"), "Marked completed")}
                >
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
                <CategoryIcon icon={booking.icon} />
                <div>
                  <p className="font-semibold">{booking.packageName}</p>
                  <p className="text-sm text-muted">
                    {booking.categoryName}
                    {booking.duration ? `, ${booking.duration}` : ""}
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
                <Line icon={<CalendarDays />} value={formatISODate(booking.date)} />
                <Line icon={<Clock />} value={booking.slot} />
                <Line icon={<MapPin />} value={`${booking.address} (${booking.zone})`} />
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
                    !closed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => unassignProvider(booking.id), "Provider removed")}
                      >
                        Change provider
                      </Button>
                    )
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
                  <ProviderPayForm
                    key={booking.providerPay ?? "none"}
                    initial={booking.providerPay}
                    rate={assigned.rate}
                    closed={closed}
                    pending={pending}
                    onSave={(value) => run(() => updateProviderPay(booking.id, value), "Provider pay saved")}
                  />
                </div>
                <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
                  <a
                    href={smsHref}
                    onClick={() => run(() => logJobSheetSent(booking.id))}
                    className="inline-flex h-8 items-center rounded-[10px] bg-ink-50 px-3 text-sm font-semibold text-ink-900 hover:bg-ink-100"
                    title={smsBody}
                  >
                    Send job sheet (SMS)
                  </a>
                  <Button
                    size="sm"
                    variant="subtle"
                    disabled={pending}
                    onClick={() => run(() => notifyCustomerAssigned(booking.id), "Customer emailed")}
                  >
                    Notify customer
                  </Button>
                </div>
              </Card>
            ) : closed ? (
              <Card className="p-5 text-sm text-muted">No provider was assigned to this booking.</Card>
            ) : (
              <AssignPanel
                booking={booking}
                candidates={candidates}
                pending={pending}
                onAssign={(p, amount) => run(() => assignProvider(booking.id, p.id, amount), `Assigned to ${p.name}`)}
              />
            )}
          </section>

          <MessageThread bookingRef={booking.id} initial={messages} as="team" key={messages.length} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Customer" action={<ContactButtons phone={customer.phone} email={customer.email} />} />
            <div className="space-y-1 p-5 text-sm">
              <Link href={`/admin/customers/${customer.id}`} className="font-semibold hover:underline">
                {customer.name}
              </Link>
              {customer.blocked && <Badge tone="danger">Blocked</Badge>}
              <p className="text-muted">{customer.email}</p>
              <p className="text-muted">{customer.phone}</p>
              <p className="pt-2 text-muted">
                {customer.bookings} booking{customer.bookings === 1 ? "" : "s"}, {money(customer.spent)} paid lifetime
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Money" />
            <dl className="space-y-2 p-5 text-sm">
              <Row label={booking.packageName} value={money2(booking.packagePrice)} />
              {extras.map((a) => (
                <Row key={a.id} label={a.name} value={money2(a.price)} />
              ))}
              {booking.surcharge > 0 && <Row label="Travel fee" value={money2(booking.surcharge)} />}
              {booking.discount > 0 && (
                <Row
                  label={`Promo${booking.couponCode ? ` ${booking.couponCode}` : ""}`}
                  value={`−${money2(booking.discount)}`}
                />
              )}
              <Row label="Customer pays" value={money2(booking.total)} strong />
              <Row
                label="Provider pay"
                value={assigned && booking.providerPay !== null ? `−${money2(booking.providerPay)}` : "—"}
              />
              <Row label="Your margin" value={money2(margin)} strong accent />
              <p className="text-xs text-muted">GST collected: {money2(booking.total / 11)}</p>
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
              {!["paid", "refunded"].includes(booking.payment) && (
                <Button
                  size="sm"
                  variant="subtle"
                  disabled={pending}
                  onClick={() => run(() => recordPayment(booking.id, "paid"), "Payment recorded")}
                >
                  Record payment
                </Button>
              )}
              {["paid", "partial"].includes(booking.payment) && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => recordPayment(booking.id, "refunded"), "Refund recorded")}
                >
                  Record refund
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => emailInvoice(booking.id), "Invoice emailed")}
              >
                Email invoice
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <ol className="space-y-3 p-5">
              {timeline.map((t) => (
                <li key={t.id} className="flex gap-3 text-sm">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="font-medium">{t.message}</span>
                    <span className="block text-xs text-muted">
                      {t.by}, {stamp(t.at)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Internal notes" description="Only admins see these." />
            {notes.length > 0 && (
              <ul className="space-y-3 px-5 pt-4">
                {notes.map((n) => (
                  <li key={n.id} className="whitespace-pre-line rounded-xl bg-paper p-3 text-sm ring-1 ring-line">
                    {n.text}
                    <span className="mt-1 block text-xs text-muted">
                      {n.by}, {stamp(n.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="space-y-2 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!note.trim()) return;
                run(
                  () => addBookingNote(booking.id, note),
                  "Note added",
                  (res) => {
                    setNotes((x) => [...x, res.note]);
                    setNote("");
                  },
                );
              }}
            >
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note"
                className="min-h-20"
                maxLength={2000}
              />
              <Button size="sm" type="submit" variant="outline" disabled={pending || !note.trim()}>
                Add note
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <EditModal
        key={`${booking.date}|${booking.slot}|${booking.address}|${booking.total}|${booking.notes}`}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        booking={booking}
        timeSlots={timeSlots}
        pending={pending}
        error={modalError}
        onSave={(values) =>
          run(
            () => updateBookingDetails(booking.id, values),
            "Booking updated",
            () => setEditOpen(false),
          )
        }
      />

      <CancelModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        booking={booking}
        pending={pending}
        error={modalError}
        onConfirm={(reason, refund) =>
          run(
            () => adminCancelBooking(booking.id, reason, refund),
            "Booking cancelled",
            () => setCancelOpen(false),
          )
        }
      />
      {toastNode}
    </>
  );
}

function ProviderPayForm({ initial, rate, closed, pending, onSave }) {
  const [pay, setPay] = useState(initial ?? "");
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(pay);
      }}
    >
      <Field label="Provider pay ($)" htmlFor="pay" hint={rate ? `Rate: ${rate}` : undefined}>
        <Input
          id="pay"
          type="number"
          min="0"
          step="0.01"
          value={pay}
          onChange={(e) => setPay(e.target.value)}
          className="h-10 w-28"
          disabled={closed}
        />
      </Field>
      {!closed && pay !== "" && Number(pay) !== initial && (
        <Button size="sm" type="submit" variant="outline" className="mb-0.5 h-10" disabled={pending}>
          Save
        </Button>
      )}
    </form>
  );
}

function EditModal({ open, onClose, booking, timeSlots, pending, error, onSave }) {
  const [v, setV] = useState({
    date: booking.date,
    slot: booking.slot,
    address: booking.address,
    total: String(booking.total),
    notes: booking.notes,
    notify: "email",
  });
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const slots = timeSlots.includes(booking.slot) ? timeSlots : [booking.slot, ...timeSlots];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit booking details"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => onSave(v)} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="ed-date">
          <Input id="ed-date" type="date" value={v.date} onChange={set("date")} />
        </Field>
        <Field label="Arrival window" htmlFor="ed-slot">
          <Select id="ed-slot" value={v.slot} onChange={set("slot")}>
            {slots.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Address" htmlFor="ed-address" className="sm:col-span-2">
          <Input id="ed-address" value={v.address} onChange={set("address")} maxLength={255} />
        </Field>
        <Field label="Total, GST incl. ($)" htmlFor="ed-total" hint="Change only if the job scope changed.">
          <Input id="ed-total" type="number" min="0" step="0.01" value={v.total} onChange={set("total")} />
        </Field>
        <Field label="Notify customer" htmlFor="ed-notify">
          <Select id="ed-notify" value={v.notify} onChange={set("notify")}>
            <option value="email">Email the customer</option>
            <option value="none">Don’t notify</option>
          </Select>
        </Field>
        <Field label="Access notes" htmlFor="ed-notes" className="sm:col-span-2">
          <Textarea id="ed-notes" value={v.notes} onChange={set("notes")} maxLength={1000} />
        </Field>
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </Modal>
  );
}

function CancelModal({ open, onClose, booking, pending, error, onConfirm }) {
  const [reason, setReason] = useState("Customer request");
  const [refund, setRefund] = useState("full");
  const paid = ["paid", "partial"].includes(booking.payment);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cancel ${booking.id}?`}
      description="The customer is emailed. Let the assigned provider know yourself."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Keep booking
          </Button>
          <Button variant="danger" onClick={() => onConfirm(reason, paid ? refund : "none")} disabled={pending}>
            {pending ? "Cancelling…" : "Cancel booking"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Reason" htmlFor="cx-reason">
          <Select id="cx-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Customer request</option>
            <option>No provider available</option>
            <option>Weather</option>
            <option>Duplicate booking</option>
            <option>Other</option>
          </Select>
        </Field>
        {paid && (
          <Field label="Refund" htmlFor="cx-refund" hint="Records the refund. Send the money back the way it was paid.">
            <Select id="cx-refund" value={refund} onChange={(e) => setRefund(e.target.value)}>
              <option value="full">Full refund ({money2(booking.total)})</option>
              <option value="partial">Partial refund (arrange separately)</option>
              <option value="none">No refund (late cancellation)</option>
            </Select>
          </Field>
        )}
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </Modal>
  );
}

/**
 * The middleman's core tool: find who can do this job.
 * Candidates have the skill; filters for zone, the weekday and active status. Sorted by
 * zone + day match, fewest other jobs that day, then rating. Document gaps are flagged.
 */
function AssignPanel({ booking, candidates, pending, onAssign }) {
  const day = booking.day;
  const zone = booking.zone;
  const [onlyZone, setOnlyZone] = useState(true);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const [q, setQ] = useState("");
  const [choosing, setChoosing] = useState(null);
  const [amount, setAmount] = useState("");

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return candidates
      .filter((p) => (!onlyZone || p.inZone) && (!onlyAvailable || p.available) && (!onlyActive || p.status === "active"))
      .filter((p) => !t || `${p.name} ${p.business}`.toLowerCase().includes(t))
      .sort(
        (a, b) =>
          Number(b.inZone) + Number(b.available) - (Number(a.inZone) + Number(a.available)) ||
          a.jobsThatDay - b.jobsThatDay ||
          b.rating - a.rating,
      );
  }, [candidates, onlyZone, onlyAvailable, onlyActive, q]);

  return (
    <Card className="border-brand-400">
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-sans text-[15px] font-semibold tracking-normal">
              <UserRoundCheck className="size-4 text-brand-600" /> Find a provider
            </h3>
            <p className="mt-0.5 text-sm text-muted">
              {candidates.length} provider{candidates.length === 1 ? "" : "s"} offer {booking.categoryName.toLowerCase()}. Job is
              in {zone} on {day}.
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
                    <span>{p.jobs} jobs done</span>
                    {p.rate && (
                      <span>
                        {payTypeLabel[p.payType]}: {p.rate}
                      </span>
                    )}
                    <span>
                      {p.jobsThatDay ? `${p.jobsThatDay} other job${p.jobsThatDay > 1 ? "s" : ""} that day` : "Free that day"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Match ok={p.inZone} label="Zone" />
                    <Match ok={p.available} label={day} />
                    <Match ok={p.compliant} label={p.compliant ? "Docs" : `Docs: ${p.missing.join(", ")}`} />
                    {p.status !== "active" && <Badge tone="warn">{p.status}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ContactButtons phone={p.phone} email={p.email} />
                <Button
                  size="sm"
                  onClick={() => {
                    setChoosing(p);
                    setAmount(String(suggestPay(p.rate, booking.total)));
                  }}
                  disabled={p.status !== "active" || pending}
                >
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

      <Modal
        open={Boolean(choosing)}
        onClose={() => setChoosing(null)}
        title={choosing ? `Assign ${choosing.name}?` : ""}
        description={choosing && !choosing.compliant ? `Heads up: ${choosing.missing.join(", ")} not on file.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setChoosing(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending || amount === "" || Number(amount) < 0}
              onClick={() => {
                onAssign(choosing, amount);
                setChoosing(null);
              }}
            >
              Assign
            </Button>
          </>
        }
      >
        <Field
          label="Provider pay ($)"
          htmlFor="assign-pay"
          hint={choosing?.rate ? `Their rate: ${choosing.rate}. Customer pays ${money2(booking.total)}.` : undefined}
        >
          <Input id="assign-pay" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </Modal>
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