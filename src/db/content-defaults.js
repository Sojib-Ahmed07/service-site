// src/db/content-defaults.js
/**
 * Starting website content. `npm run db:seed` and `npm run db:content` copy this into
 * the database; after that, everything is edited in Admin › Content and Admin › Settings.
 * The site only falls back to this file if a row is missing.
 *
 * Words in {braces} are filled in from Admin › Settings (see src/lib/cms.js).
 */

let n = 0;
const id = () => ++n;
const h = (text) => ({ id: id(), type: "heading", text });
const p = (text) => ({ id: id(), type: "text", text });
const cards = (style, items) => ({ id: id(), type: "cards", style, items });

export const homepageDefaults = {
    heroTitle: "Every job around the house, sorted.",
    heroText: "Cleaning, pest control, gardening and repairs at fixed prices. Book in two minutes and we send a vetted local pro.",
    heroBadge: "Police-checked and insured",
    popularTitle: "Most booked this month",
    popularText: "Fixed packages, so you see the price before you book.",
    howTitle: "Booked in minutes, not phone calls.",
    howText: "No chasing quotes or comparing tradies. Tell us what you need and when — we handle the rest.",
    steps: [
        {
            title: "Choose a service",
            body: "Pick a package and see the exact price before you book. Add extras like an oven clean in one tap.",
        },
        { title: "Pick a time", body: "Choose a two-hour arrival window that suits you. Leave access notes if you won’t be home." },
        {
            title: "We send a vetted pro",
            body: "We match a checked, insured local professional to your job and keep you updated throughout.",
        },
    ],
    teamTitle: "One booking. One team accountable for the result.",
    teamText:
        "We’re not a directory. We vet the professionals, set the prices, schedule the work and follow up afterwards. If anything goes wrong, you call us.",
    teamPoints: [
        "Fixed price before you book",
        "Pros vetted and insured",
        "Reminders and live updates",
        "{guarantee_hours}-hour make-it-right guarantee",
    ],
    reviewsTitle: "What customers say",
    reviewsText: "Reviews from verified bookings only.",
    areasText: "Outer suburbs carry a small travel fee, shown at checkout.",
    faqTitle: "Questions",
    ctaTitle: "Get it off your list this week.",
    ctaText: "Most services can be booked for the next available day.",
    sections: [
        { id: "browse", visible: true },
        { id: "popular", visible: true },
        { id: "how", visible: true },
        { id: "team", visible: true },
        { id: "reviews", visible: true },
        { id: "areas", visible: true },
        { id: "faq", visible: true },
    ],
};

/** Built-in pages: header text (title + intro) and body blocks. */
export const pageDefaults = {
    "/services": {
        title: "Services across {region}",
        intro: "Fixed-price packages, booked online in a couple of minutes. Pick a service to see what’s included.",
        blocks: [],
    },
    "/areas": {
        title: "Areas we cover",
        intro: "{region} and surrounds. Type your suburb to check availability and any travel fee.",
        blocks: [],
    },
    "/offers": {
        title: "Current offers",
        intro: "Enter the code at checkout. One code per booking.",
        blocks: [],
    },
    "/how-it-works": {
        title: "How {business_name} works",
        intro: "You book with us, we send a vetted local pro, and we stay responsible for the job from start to finish.",
        blocks: [
            h("How we choose our pros"),
            p("Fewer than one in four applicants make it onto our team. Here’s what every one of them has passed."),
            cards("ticks", [
                {
                    title: "ABN and insurance",
                    body: "Every pro holds an active ABN and at least $10m public liability cover. We keep copies on file and check expiry dates.",
                },
                { title: "National police check", body: "Completed before their first job, and renewed every two years." },
                {
                    title: "Trade licences",
                    body: "Electricians, plumbers and pest technicians must hold a current Tasmanian licence for their trade.",
                },
                { title: "Ongoing ratings", body: "Every job is rated. Pros who fall below our standard stop receiving work." },
            ]),
        ],
    },
    "/guarantee": {
        title: "The {business_name} guarantee",
        intro: "If a job isn’t done to the standard you booked, we put it right. No arguments, no fine print hunting.",
        blocks: [
            cards("numbered", [
                {
                    title: "Tell us within {guarantee_hours} hours",
                    body: "Reply to your confirmation email, call us or use “Report a problem” on your booking. Photos help.",
                },
                {
                    title: "We review it the same day",
                    body: "Our team looks at the job notes and photos, and calls you if we need more detail.",
                },
                {
                    title: "We send someone back, free",
                    body: "A pro returns to fix the areas that weren’t right — usually within two business days.",
                },
                { title: "Or we refund that part", body: "If it still can’t be put right, we refund the affected part of the job." },
            ]),
            h("What’s covered"),
            p(
                "Workmanship on the tasks listed in your package and any extras you added. End of lease cleans have an extended 72-hour window for agent reports.",
            ),
            p("Damage is covered separately by our pros’ public liability insurance; we’ll manage that claim for you."),
        ],
    },
    "/about": {
        title: "A {city} business, looking after {city} homes",
        intro:
            "{business_name} started with a simple idea: booking a cleaner or a pest treatment should be as easy as ordering takeaway, and someone should be accountable for the result.",
        blocks: [
            p(
                "Finding reliable help in {city} usually means ringing around, waiting on quotes and hoping whoever turns up is insured. We do that work once, properly, so you don’t have to.",
            ),
            p(
                "We partner with independent local cleaners, technicians and tradespeople, check their credentials, agree fair fixed prices, and handle all the scheduling. You book with us, pay us, and talk to us. Our pros get steady work without chasing invoices.",
            ),
            p("Everything is run from our office in {city}, by people who live here."),
        ],
    },
    "/help": {
        title: "How can we help?",
        intro: "Answers to common questions, or get in touch with our {city} team.",
        blocks: [],
    },
    "/contact": {
        title: "Get in touch",
        intro: "Questions, custom quotes, commercial work or a problem with a job — we’re here.",
        blocks: [],
    },
    "/partners": {
        title: "Work with {business_name}",
        intro: "We’re looking for reliable, insured cleaners, technicians and tradespeople across {region}.",
        blocks: [
            cards("ticks", [
                { title: "Steady, scheduled work", body: "We send you confirmed jobs in your zones, on the days you choose." },
                {
                    title: "Paid weekly, no chasing",
                    body: "We collect from the customer. You’re paid every Friday for completed jobs.",
                },
                {
                    title: "You focus on the work",
                    body: "No quoting, no marketing, no admin. We handle the customer from start to finish.",
                },
            ]),
        ],
    },
    "/blog": {
        title: "Home care guides",
        intro: "Practical advice for looking after a home in southern Tasmania’s climate.",
        blocks: [],
    },
    "/terms": {
        title: "Terms of service",
        intro: "This is template text — have it reviewed by a lawyer before launch.",
        blocks: [
            h("Who we are"),
            p(
                "{business_name} (ABN {abn}) arranges home services in {region}. Services are performed by independent professionals we engage on your behalf. Your contract for the booking is with {business_name}.",
            ),
            h("Bookings and prices"),
            p(
                "Prices shown include GST. The price you see at checkout is the price you pay unless the job differs materially from what was booked, in which case we’ll contact you to approve any change before work continues.",
            ),
            p("Arrival windows are estimates. We’ll let you know if your professional is running late."),
            h("Changes and cancellations"),
            p("You can reschedule or cancel free of charge up to {free_cancel_hours} hours before your arrival window."),
            p(
                "Inside {free_cancel_hours} hours, a late-change fee of up to {late_fee}% of the booking may apply. If our professional can’t access the property at the booked time, the full booking may be charged.",
            ),
            h("Payment"),
            p("You pay after the job is done. Invoices are due within {invoice_days} days."),
            h("Our guarantee"),
            p(
                "If you report a problem within {guarantee_hours} hours (72 hours for end of lease cleans), we’ll send someone back to fix it free or refund the affected part of the job.",
            ),
            h("Australian Consumer Law"),
            p("Nothing in these terms limits your rights under the Australian Consumer Law."),
        ],
    },
    "/privacy": {
        title: "Privacy policy",
        intro: "This is template text — have it reviewed by a lawyer before launch.",
        blocks: [
            h("What we collect"),
            p(
                "Your name, contact details, service address, access notes, booking history and payment records. We don’t store full card numbers; our payment provider does.",
            ),
            h("How we use it"),
            p(
                "To arrange and complete your bookings, send updates and receipts, handle complaints and improve our service. We only send marketing if you opt in.",
            ),
            h("Who we share it with"),
            p(
                "The professional assigned to your job receives only what they need: first name, address, booking details and access notes. We never sell your information.",
            ),
            h("Your rights"),
            p(
                "You can access, correct or delete your information at any time from your account or by emailing {email}. We handle personal information in line with the Privacy Act 1988 (Cth).",
            ),
        ],
    },
};

export const paymentDefaults = { invoiceDays: 7 };

export const notificationDefaults = {
    jobSheetTemplate:
        "New Sorted job {booking_id}\n{service} — {package}\n{date}, {slot}\n{address}\nNotes: {access_notes}\nPay: {provider_pay}\nReply YES to confirm.",
    // Automatic customer emails (emails you send by hand from a booking always go out).
    emails: {
        confirmation: true, // booking received (online checkout)
        changes: true, // customer rescheduled / cancelled online
        cancellation: true, // you cancelled the booking
        reminder: true, // day before the job (daily job)
        review: true, // review request after a completed job (daily job)
    },
    adminNewBooking: true, // email the business when someone books online
    adminChanges: true, // email the business when a customer reschedules or cancels
};

/** Rows for the `pages` table (used by the seed and `npm run db:content`). */
export function defaultPageRows() {
    return Object.entries(pageDefaults).map(([slug, p]) => ({
        slug,
        title: p.title,
        intro: p.intro || null,
        blocks: p.blocks,
        status: "published",
    }));
}

/** Content-related site_settings rows. */
export const defaultContentSettings = {
    homepage: homepageDefaults,
    notifications: notificationDefaults,
    payments: paymentDefaults,
};