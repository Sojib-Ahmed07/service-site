// src/components/site/booking-actions.jsx
"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendBookingMessage } from "@/server/actions/bookings";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Card, CardHeader } from "@/components/ui/misc";
import { Modal, useToast } from "@/components/ui/interactive";

/**
 * Reschedule / cancel / review / report on a customer's booking.
 * TODO (batch 3): these modals still only show a confirmation toast; they get Server Actions next.
 * `timeSlots` come from Settings › Booking rules.
 */
export function BookingActions({ canChange, completed, timeSlots = [] }) {
  const [modal, setModal] = useState(null);
  const { toast, toastNode } = useToast();
  const close = () => setModal(null);
  const done = (msg) => {
    close();
    toast(msg);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {canChange && (
        <>
          <Button variant="outline" onClick={() => setModal("reschedule")}>
            Reschedule
          </Button>
          <Button variant="ghost" className="text-danger hover:bg-danger-50" onClick={() => setModal("cancel")}>
            Cancel booking
          </Button>
        </>
      )}
      {completed && (
        <>
          <Button onClick={() => setModal("review")}>Leave a review</Button>
          <Button variant="outline" onClick={() => setModal("problem")}>
            Report a problem
          </Button>
        </>
      )}

      <Modal
        open={modal === "reschedule"}
        onClose={close}
        title="Reschedule booking"
        description="Free up to 24 hours before your arrival window."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Keep current time
            </Button>
            <Button onClick={() => done("Booking rescheduled")}>Reschedule</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New date">
            <Input type="date" />
          </Field>
          <Field label="Arrival window">
            <Select>
              {timeSlots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={modal === "cancel"}
        onClose={close}
        title="Cancel this booking?"
        description="You’ll get a full refund because it’s more than 24 hours away."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Keep booking
            </Button>
            <Button variant="danger" onClick={() => done("Booking cancelled")}>
              Cancel booking
            </Button>
          </>
        }
      >
        <Field label="Reason (optional)">
          <Select>
            <option>Plans changed</option>
            <option>Found someone else</option>
            <option>Booked by mistake</option>
            <option>Other</option>
          </Select>
        </Field>
      </Modal>

      <Modal
        open={modal === "review"}
        onClose={close}
        title="How did we do?"
        footer={<Button onClick={() => done("Thanks for your review")}>Submit review</Button>}
      >
        <StarInput />
        <Field label="Tell us more" className="mt-4">
          <Textarea placeholder="What went well? What could be better?" />
        </Field>
      </Modal>

      <Modal
        open={modal === "problem"}
        onClose={close}
        title="Report a problem"
        description="Covered by our 48-hour guarantee. We’ll be in touch today."
        footer={<Button onClick={() => done("Problem reported — we’ll call you shortly")}>Send report</Button>}
      >
        <Field label="What wasn’t right?">
          <Textarea />
        </Field>
        <Field label="Photos (optional)" className="mt-4">
          <Input type="file" multiple accept="image/*" className="py-2" />
        </Field>
      </Modal>
      {toastNode}
    </div>
  );
}

function StarInput() {
  const [v, setV] = useState(0);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          role="radio"
          aria-checked={v === i}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onClick={() => setV(i)}
          className={cn("text-4xl leading-none transition-colors", i <= v ? "text-brand-500" : "text-line-strong")}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/** Customer ↔ Sorted thread, saved to the database. Providers never see or post here. */
export function MessageThread({ bookingRef, initial = [] }) {
  const [msgs, setMsgs] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, start] = useTransition();
  return (
    <Card>
      <CardHeader title="Messages" description="Talk to the Sorted team about this booking." />
      <div className="max-h-80 space-y-3 overflow-y-auto p-5">
        {msgs.length === 0 && <p className="text-sm text-muted">No messages yet. Questions about access or timing? Ask here.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.from === "customer" ? "justify-end" : "justify-start")}>
            <p
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px]",
                m.from === "customer" ? "rounded-br-md bg-ink-900 text-white" : "rounded-bl-md bg-paper ring-1 ring-line",
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
            const res = await sendBookingMessage(bookingRef, value);
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