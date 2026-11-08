// src/server/email-templates.js
/**
 * The wording of every email the site sends, in one place. Each function returns an object
 * for `sendEmail()` (see email.js): { to, toName, subject, event?, greeting, paragraphs, details, action, after }.
 * `biz` is getBusiness() (name, phone, url…). Money is in dollars incl. GST.
 */
import "server-only";
import { formatISODate } from "@/lib/dates";
import { money2 } from "@/lib/utils";

const first = (name) => String(name ?? "").trim().split(/\s+/)[0] || "there";
const hi = (name) => `Hi ${first(name)},`;
const bookingUrl = (biz, ref) => `${biz.url}/account/bookings/${encodeURIComponent(ref)}`;
const when = (date, slot) => `${formatISODate(date)}, ${slot}`;
const callUs = (biz) => (biz.phone ? `Questions? Reply to this email or call us on ${biz.phone}.` : "Questions? Just reply to this email.");

/** Booking details rows used by most booking emails. */
function bookingRows(b) {
    return [
        ["Reference", b.reference],
        ["Service", b.packageName ? `${b.service} — ${b.packageName}` : b.service],
        ["When", b.date ? when(b.date, b.slot) : ""],
        ["Address", b.address],
        ["Total", b.total !== undefined && b.total !== null ? `${money2(b.total)} (GST incl.)` : ""],
    ];
}

/* Customer: bookings --------------------------------------------------------- */

/** Online checkout. Switchable: "confirmation". */
export const bookingReceived = (biz, b) => ({
    to: b.email,
    toName: b.name,
    event: "confirmation",
    subject: `Booking ${b.reference} received — ${b.service}`,
    preheader: `${b.service}, ${when(b.date, b.slot)}`,
    greeting: hi(b.name),
    paragraphs: [`Thanks for booking with ${biz.name}. Here are your booking details.`],
    details: [...bookingRows(b), ["Payment", "After the job"]],
    action: { label: "View your booking", href: bookingUrl(biz, b.reference) },
    after: ["We'll email you again once a vetted local pro is assigned.", callUs(biz)],
});

/** Booking an admin took by phone/email (sent when "Send confirmation" is ticked). */
export const bookingConfirmedByTeam = (biz, b) => ({
    to: b.email,
    toName: b.name,
    tag: "confirmation-phone",
    subject: `Booking ${b.reference} confirmed — ${b.service}`,
    preheader: `${b.service}, ${when(b.date, b.slot)}`,
    greeting: hi(b.name),
    paragraphs: [`Thanks for booking with ${biz.name}. Here's a copy of your booking.`],
    details: [...bookingRows(b), ["Payment", b.paid ? "Paid, thank you" : "After the job"]],
    action: { label: "View your booking", href: bookingUrl(biz, b.reference) },
    after: [callUs(biz)],
});

/** An admin edited the time, address or price (sent when "Notify customer" is email). */
export const bookingUpdatedByTeam = (biz, b) => ({
    to: b.email,
    toName: b.name,
    tag: "updated",
    subject: `Booking ${b.reference} updated`,
    greeting: hi(b.name),
    paragraphs: ["We've updated your booking. Here are the new details."],
    details: bookingRows(b),
    action: { label: "View your booking", href: bookingUrl(biz, b.reference) },
    after: [callUs(biz)],
});

/** The customer moved their own booking online. Switchable: "changes". */
export const bookingRescheduled = (biz, b) => ({
    to: b.email,
    toName: b.name,
    event: "changes",
    subject: `Booking ${b.reference} moved to ${formatISODate(b.date, { weekday: "short", day: "numeric", month: "short" })}`,
    greeting: hi(b.name),
    paragraphs: [`Your booking has been moved from ${when(b.oldDate, b.oldSlot)} to the time below.`],
    details: bookingRows(b),
    action: { label: "View your booking", href: bookingUrl(biz, b.reference) },
    after: [b.releasedPro ? "We'll email you once a pro is confirmed for the new time." : "", callUs(biz)],
});

/** The customer cancelled online. Switchable: "changes". */
export const bookingCancelledByCustomer = (biz, b) => ({
    to: b.email,
    toName: b.name,
    event: "changes",
    subject: `Booking ${b.reference} cancelled`,
    greeting: hi(b.name),
    paragraphs: [
        `As requested, your ${b.service} booking on ${when(b.date, b.slot)} has been cancelled.`,
        b.needsRefund ? "You've already paid for this booking, so our team will be in touch about your refund." : "",
    ],
    action: { label: "Book again", href: `${biz.url}/services` },
    after: [callUs(biz)],
});

/** An admin cancelled the booking. Switchable: "cancellation". */
export const bookingCancelledByTeam = (biz, b) => ({
    to: b.email,
    toName: b.name,
    event: "cancellation",
    subject: `Booking ${b.reference} cancelled`,
    greeting: hi(b.name),
    paragraphs: [
        `Your booking ${b.reference} on ${when(b.date, b.slot)} has been cancelled.`,
        b.refund === "full" ? "A full refund is on its way." : b.refund === "partial" ? "Our team will be in touch about a partial refund." : "",
        "Sorry for any inconvenience.",
    ],
    after: [callUs(biz)],
});

/** Sent from the booking page ("Email customer"). Never names the provider. */
export const proAssigned = (biz, b) => ({
    to: b.email,
    toName: b.name,
    tag: "pro-assigned",
    subject: `Your pro is booked — ${b.reference}`,
    greeting: hi(b.name),
    paragraphs: [`A vetted local ${biz.name} pro has been assigned to your booking.`],
    details: [
        ["Reference", b.reference],
        ["When", when(b.date, b.slot)],
        ["Address", b.address],
    ],
    action: { label: "View your booking", href: bookingUrl(biz, b.reference) },
    after: ["We'll send you a reminder the day before.", callUs(biz)],
});

/** Day before the job (daily job). Switchable: "reminder"; respects the customer's email preference. */
export const dayBeforeReminder = (biz, b, freeChangeHours) => ({
    to: b.email,
    toName: b.name,
    event: "reminder",
    subject: `Reminder: ${b.service} tomorrow, ${b.slot}`,
    preheader: `Your pro arrives ${b.slot}.`,
    greeting: hi(b.name),
    paragraphs: [`Just a reminder that your ${b.service} booking is tomorrow. Your pro will arrive during the window below.`],
    details: [
        ["Reference", b.reference],
        ["When", when(b.date, b.slot)],
        ["Address", b.address],
        ["Access notes", b.accessNotes || "None"],
    ],
    action: { label: "View your booking", href: bookingUrl(biz, b.reference) },
    after: [
        "Please make sure your pro can get in, and let us know about pets, parking or anything else they should know.",
        freeChangeHours > 0 && biz.phone ? `Need to change something? Online changes close ${freeChangeHours} hours before your window, so please call us on ${biz.phone}.` : callUs(biz),
    ],
});

/** After a completed job (daily job). Switchable: "review"; respects the customer's email preference. */
export const reviewRequest = (biz, b) => ({
    to: b.email,
    toName: b.name,
    event: "review",
    subject: `How did your ${b.service.toLowerCase()} go?`,
    greeting: hi(b.name),
    paragraphs: [
        `Thanks for choosing ${biz.name}. Your ${b.service} booking (${b.reference}) is complete.`,
        "Could you take a minute to tell us how it went? Your review helps other locals and helps us look after every job.",
    ],
    action: { label: "Leave a review", href: bookingUrl(biz, b.reference) },
    after: ["Something not right? You can report a problem from the same page and we'll sort it out."],
});

/* Customer: money -------------------------------------------------------------- */

export const paymentReminder = (biz, b) => ({
    to: b.email,
    toName: b.name,
    tag: "payment-reminder",
    subject: `Payment reminder for booking ${b.reference}`,
    greeting: hi(b.name),
    paragraphs: [`A friendly reminder that payment is due for your booking ${b.reference} on ${formatISODate(b.date)}.`],
    details: [
        ["Reference", b.reference],
        ["Amount due", `${money2(b.total)} (GST incl.)`],
    ],
    after: [callUs(biz), "If you've already paid, thank you, and please ignore this email."],
    signOff: `Thanks,\n${biz.name}`,
});

/**
 * Australian tax invoice: the words "Tax invoice", seller name + ABN, issue date, what was supplied,
 * GST amount and total. Customer name included (required from $1,000).
 */
export const taxInvoice = (biz, b, issued, invoiceDays) => ({
    to: b.email,
    toName: b.name,
    tag: "invoice",
    subject: `Tax invoice for booking ${b.reference}`,
    greeting: hi(b.name),
    paragraphs: [`Here's your tax invoice from ${biz.name}.`],
    details: [
        ["Tax invoice", b.reference],
        ["Issued", formatISODate(issued, { day: "numeric", month: "long", year: "numeric" })],
        ["From", [biz.name, biz.abn ? `ABN ${biz.abn}` : ""].filter(Boolean).join(", ")],
        ["Billed to", b.name],
        ["Service date", formatISODate(b.date, { day: "numeric", month: "long", year: "numeric" })],
        ...b.lines.map((l) => [l.name, money2(l.amount)]),
        ...(b.surcharge > 0 ? [["Travel fee", money2(b.surcharge)]] : []),
        ...(b.discount > 0 ? [[b.couponCode ? `Discount (${b.couponCode})` : "Discount", `−${money2(b.discount)}`]] : []),
        ...(b.adjustment ? [["Price adjustment", `${b.adjustment < 0 ? "−" : ""}${money2(Math.abs(b.adjustment))}`]] : []),
        ["GST included", money2(b.total / 11)],
        ["Total (incl. GST)", money2(b.total)],
        ["Status", b.paid ? "Paid, thank you" : Number(invoiceDays) > 0 ? `Due within ${invoiceDays} days` : "Due on receipt"],
    ],
    after: [callUs(biz)],
    signOff: `Thanks,\n${biz.name}`,
});

/* Customer: messages ----------------------------------------------------------- */

export const teamMessage = (biz, b, body) => ({
    to: b.email,
    toName: b.name,
    tag: "message",
    subject: `New message about booking ${b.reference}`,
    greeting: hi(b.name),
    paragraphs: [`The ${biz.name} team sent you a message about booking ${b.reference}:`, body],
    action: { label: "Reply in your account", href: bookingUrl(biz, b.reference) },
});

export const enquiryReply = (biz, e, body, adminName) => ({
    to: e.email,
    toName: e.name,
    tag: "enquiry-reply",
    subject: `Re: ${e.subject || "your message"}`,
    greeting: hi(e.name),
    paragraphs: [body],
    signOff: `${first(adminName)}\n${biz.name}${biz.phone ? ` · ${biz.phone}` : ""}`,
});

/* Accounts --------------------------------------------------------------------- */

export const passwordReset = (biz, user, url) => ({
    to: user.email,
    toName: user.name,
    tag: "password-reset",
    // Also used when a guest ticks "create an account" at checkout, so it works for new and existing passwords.
    subject: `Choose a password for your ${biz.name} account`,
    greeting: hi(user.name),
    paragraphs: ["Use the button below to choose a password for your account. The link expires in 1 hour."],
    action: { label: "Choose a password", href: url },
    after: ["If you didn't ask for this, you can ignore this email. Nothing will change."],
});

/* Office alerts (to the business email) ---------------------------------------- */

export const officeNewBooking = (biz, b) => ({
    to: biz.email,
    tag: "office-new-booking",
    subject: `New booking ${b.reference} — ${b.service}`,
    paragraphs: [`${b.name} booked online.`],
    details: [...bookingRows(b), ["Customer", [b.name, b.email, b.phone].filter(Boolean).join(" · ")]],
    action: { label: "Assign a pro", href: `${biz.url}/admin/bookings/${encodeURIComponent(b.reference)}` },
    signOff: "",
});

export const officeCustomerChange = (biz, b) => ({
    to: biz.email,
    tag: "office-customer-change",
    subject: `${b.reference} ${b.kind === "cancelled" ? "cancelled" : "rescheduled"} by the customer`,
    paragraphs: [
        b.kind === "cancelled"
            ? `${b.name} cancelled their ${b.service} booking on ${when(b.date, b.slot)} (${b.reason}).`
            : `${b.name} moved their ${b.service} booking from ${when(b.oldDate, b.oldSlot)} to ${when(b.date, b.slot)}.`,
        b.releasedPro
            ? b.kind === "cancelled"
                ? "A pro was assigned to this job. Let them know it's off."
                : "The assigned pro was released, so the booking needs re-assigning. Let the pro know."
            : "",
        b.needsRefund ? "This booking was paid, so a refund is needed." : "",
    ],
    action: { label: "Open the booking", href: `${biz.url}/admin/bookings/${encodeURIComponent(b.reference)}` },
    signOff: "",
});

/* Test ------------------------------------------------------------------------- */

export const testEmail = (biz, admin) => ({
    to: admin.email,
    toName: admin.name,
    tag: "test",
    subject: `Test email from ${biz.name}`,
    greeting: hi(admin.name),
    paragraphs: ["This is a test from Admin › Settings › Notifications. If you can read it, email is working."],
    details: [
        ["Sent from", process.env.EMAIL_FROM ?? ""],
        ["Replies go to", biz.email],
    ],
    action: { label: "Open settings", href: `${biz.url}/admin/settings?tab=notifications` },
});