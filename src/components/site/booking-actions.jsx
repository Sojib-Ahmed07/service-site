// src/components/site/booking-actions.jsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { formatISODate, weekdayIndex } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { cancelBooking, rescheduleBooking, reportProblem, sendBookingMessage, submitReview } from "@/server/actions/bookings";
import { getSlotAvailability } from "@/server/actions/checkout";
import { sendTeamMessage } from "@/server/actions/admin-bookings";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Card, CardHeader } from "@/components/ui/misc";
import { Modal, useToast } from "@/components/ui/interactive";

/**
 * Reschedule / cancel / review / report on a customer's booking. Every action is
 * re-checked on the server (ownership, status, the free-change window, capacity).
 * Props come from app/(site)/account/bookings/[id]/page.jsx.
 */
export function BookingActions({
  bookingRef,
  canChange,
  changeLocked = "",
  completed,
  reviewed = false,
  timeSlots = [],
  minDate,
  maxDate,
  sundays = false,
  currentDate,
  currentSlot,
  freeHours = 24,
}) {
  const router = useRouter();
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { toast, toastNode } = useToast();
  const open = (m) => {
    setError("");
    setModal(m);
  };
  const close = () => !pending && setModal(null);
  const run = (fn, success) =>
    start(async () => {
      try {
        const res = await fn();
        if (!res.ok) return setError(res.error);
        setModal(null);
        toast(typeof success === "function" ? success(res) : success);
        router.refresh();
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });

  // Reschedule state
  const [newDate, setNewDate] = useState("");
  const [newSlot, setNewSlot] = useState("");
  const [avail, setAvail] = useState({ date: "", list: [], loading: false, error: "" });
  useEffect(() => {
    if (!newDate) return;
    let cancelled = false;
    setAvail({ date: newDate, list: [], loading: true, error: "" });
    getSlotAvailability(newDate)
      .then((res) => {
        if (cancelled) return;
        setAvail({ date: newDate, list: res.ok ? res.slots : [], loading: false, error: res.ok ? "" : res.error });
      })
      .catch(() => !cancelled && setAvail({ date: newDate, list: [], loading: false, error: "Couldn’t load times." }));
    return () => {
      cancelled = true;
    };
  }, [newDate]);
  const sundayPicked = newDate && !sundays && weekdayIndex(newDate) === 0;

  // Cancel / review / report state
  const [reason, setReason] = useState("Plans changed");
  const [stars, setStars] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [problem, setProblem] = useState("");

  const ErrorLine = () => (error ? <p className="mt-4 text-sm text-danger">{error}</p> : null);

  return (
    <div className="flex flex-wrap gap-2">
      {canChange && (
        <>
          <Button variant="outline" onClick={() => open("reschedule")}>
            Reschedule
          </Button>
          <Button variant="ghost" className="text-danger hover:bg-danger-50" onClick={() => open("cancel")}>
            Cancel booking
          </Button>
        </>
      )}
      {completed && (
        <>
          {!reviewed && <Button onClick={() => open("review")}>Leave a review</Button>}
          <Button variant="outline" onClick={() => open("problem")}>
            Report a problem
          </Button>
        </>
      )}
      {changeLocked && <p className="w-full text-sm text-muted sm:max-w-xs sm:text-right">{changeLocked}</p>}

      <Modal
        open={modal === "reschedule"}
        onClose={close}
        title="Reschedule booking"
        description={`Currently ${formatISODate(currentDate)}, ${currentSlot}. Free up to ${freeHours} hours before your arrival window.`}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={pending}>
              Keep current time
            </Button>
            <Button
              disabled={pending || !newDate || !newSlot || sundayPicked}
              onClick={() => run(() => rescheduleBooking(bookingRef, newDate, newSlot), "Booking rescheduled")}
            >
              {pending ? "Saving…" : "Reschedule"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New date" htmlFor="rs-date" error={sundayPicked ? "We don’t book on Sundays." : avail.error}>
            <Input
              id="rs-date"
              type="date"
              min={minDate}
              max={maxDate}
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setNewSlot("");
              }}
            />
          </Field>
          <Field label="Arrival window" htmlFor="rs-slot">
            <Select
              id="rs-slot"
              value={newSlot}
              onChange={(e) => setNewSlot(e.target.value)}
              disabled={!newDate || avail.loading || sundayPicked}
            >
              <option value="">{avail.loading ? "Checking…" : "Choose a window"}</option>
              {timeSlots.map((s) => {
                const full = avail.date === newDate && avail.list.some((x) => x.slot === s && x.full);
                return (
                  <option key={s} value={s} disabled={full}>
                    {s}
                    {full ? " (fully booked)" : ""}
                  </option>
                );
              })}
            </Select>
          </Field>
        </div>
        <ErrorLine />
      </Modal>

      <Modal
        open={modal === "cancel"}
        onClose={close}
        title="Cancel this booking?"
        description={`Free of charge because it’s more than ${freeHours} hours away.`}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={pending}>
              Keep booking
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                run(
                  () => cancelBooking(bookingRef, reason),
                  (res) =>
                    res.needsRefund ? "Booking cancelled. We’ll refund you within 5–10 business days." : "Booking cancelled",
                )
              }
            >
              {pending ? "Cancelling…" : "Cancel booking"}
            </Button>
          </>
        }
      >
        <Field label="Reason (optional)" htmlFor="cx-reason">
          <Select id="cx-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Plans changed</option>
            <option>Found someone else</option>
            <option>Booked by mistake</option>
            <option>Other</option>
          </Select>
        </Field>
        <ErrorLine />
      </Modal>

      <Modal
        open={modal === "review"}
        onClose={close}
        title="How did we do?"
        footer={
          <Button
            disabled={pending || !stars}
            onClick={() => run(() => submitReview(bookingRef, stars, reviewText), "Thanks for your review")}
          >
            {pending ? "Sending…" : "Submit review"}
          </Button>
        }
      >
        <StarInput value={stars} onChange={setStars} />
        <Field label="Tell us more" htmlFor="rv-text" className="mt-4">
          <Textarea
            id="rv-text"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="What went well? What could be better?"
            maxLength={2000}
          />
        </Field>
        <p className="mt-2 text-xs text-muted">Reviews are checked by our team before they appear on the site.</p>
        <ErrorLine />
      </Modal>

      <Modal
        open={modal === "problem"}
        onClose={close}
        title="Report a problem"
        description="Covered by our 48-hour guarantee. We’ll be in touch today."
        footer={
          <Button
            disabled={pending || problem.trim().length < 10}
            onClick={() => run(() => reportProblem(bookingRef, problem), "Problem reported — we’ll call you shortly")}
          >
            {pending ? "Sending…" : "Send report"}
          </Button>
        }
      >
        <Field label="What wasn’t right?" htmlFor="pb-text" hint="If photos would help, we’ll ask for them when we call.">
          <Textarea id="pb-text" value={problem} onChange={(e) => setProblem(e.target.value)} maxLength={5000} />
        </Field>
        <ErrorLine />
      </Modal>
      {toastNode}
    </div>
  );
}

function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onClick={() => onChange(i)}
          className={cn("text-4xl leading-none transition-colors", i <= value ? "text-brand-500" : "text-line-strong")}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/**
 * Customer ↔ Sorted thread, saved to the database. Providers never see or post here.
 * as="customer" (account page) or as="team" (admin booking manager).
 */
export function MessageThread({ bookingRef, initial = [], as = "customer" }) {
  const mine = as === "team" ? "team" : "customer";
  const [msgs, setMsgs] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, start] = useTransition();
  return (
    <Card>
      <CardHeader
        title="Messages"
        description={
          as === "team"
            ? "Messages with the customer. They’re emailed your reply and see it in their account."
            : "Talk to the Sorted team about this booking."
        }
      />
      <div className="max-h-80 space-y-3 overflow-y-auto p-5">
        {msgs.length === 0 && (
          <p className="text-sm text-muted">
            {as === "team" ? "No messages yet." : "No messages yet. Questions about access or timing? Ask here."}
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.from === mine ? "justify-end" : "justify-start")}>
            <p
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px]",
                m.from === mine ? "rounded-br-md bg-ink-900 text-white" : "rounded-bl-md bg-paper ring-1 ring-line",
              )}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const value = text.trim();
          if (!value || sending) return;
          start(async () => {
            const res = await (as === "team" ? sendTeamMessage : sendBookingMessage)(bookingRef, value);
            if (!res.ok) return setError(res.error);
            setError("");
            setMsgs((x) => [...x, res.message]);
            setText("");
          });
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message"
          aria-label="Message"
          maxLength={2000}
          disabled={sending}
        />
        <Button type="submit" size="icon" className="size-11 shrink-0" aria-label="Send" disabled={sending || !text.trim()}>
          <Send />
        </Button>
      </form>
      {error && <p className="px-4 pb-3 text-sm text-danger">{error}</p>}
    </Card>
  );
}