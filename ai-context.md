# AI_CONTEXT.md — Sorted (home services website)

> **For any AI assistant (Claude, ChatGPT, Gemini, Cursor, Copilot…):** this file is the single source of truth for this
> project. Read all of it before writing code. The owner pastes it (with `START-HERE.md`) at the start of every new chat.
>
> **Your first reply in a new chat:** confirm in one line that you've read it, restate the task, list every file you will
> create or change, list any `npm install` / `db:push` / env changes, and ask for the current contents of any existing file
> you need to edit that you haven't been shown. **Never guess what an existing file contains. Ask for it.**

Last updated: **5 Nov 2026**, after Batch 6 + the Batch 3 missing-files fix.

---

## 0. Quick facts

| Item | Value |
| --- | --- |
| Product | **Sorted** — a home-services booking website (like Urban Company / Jim's Group). Tagline "Home services, sorted." |
| Market | Greater Hobart, Tasmania, Australia. Currency **AUD**, prices **include GST**, timezone **Australia/Hobart**, locale **en-AU** |
| Business model | **Middleman.** Sorted lists services at fixed prices. Customers book and pay Sorted. An admin assigns a provider (worker) offline by phone/SMS. **Customers and providers never interact through the site.** |
| Login roles | **Exactly two: `customer` and `admin`.** No provider login. Providers are records the admin manages. Admins also have a `teamRole`: Owner / Operations / Support |
| Language | **JavaScript only** (`.js` / `.jsx`). No TypeScript, no `.ts/.tsx`, no `tsconfig.json`, no type annotations |
| Stack | Next.js **16** (App Router, Turbopack) · React **19** · Tailwind CSS **v4** · lucide-react · zod **v4** · Better Auth **1.7** · Drizzle ORM + `pg` · Neon Postgres |
| Data | **Everything comes from the database.** No mock data anywhere (`src/lib/data.js` was deleted). Website wording is edited in Admin › Content and Admin › Settings |
| Card payments | **Not built — on hold until the owner picks a provider** (see §11). Customers "pay after the job"; admins record payments by hand |
| Email / SMS | **Not connected yet.** `sendEmail()` prints emails to the server terminal. SMS job sheets open the admin's phone via an `sms:` link |
| Owner's machine | Windows, PowerShell, project at `D:\projects\service-site`. Their editor reformats files (4-space indent, CRLF) — that's fine |
| Package manager | npm · Node 20.9+ |

---

## 1. How the owner wants to work (IMPORTANT)

1. **Batches.** Build one batch of related features at a time, fully working, then stop. Don't do everything at once.
2. **No mistakes, glitches or bugs.** Every control on screen must actually work. If something can't work yet (e.g. needs a
   paid provider or uploads), remove it or show an honest "not switched on yet" note — never a fake toast/save.
3. **No hardcoded content or mock data.** Text the business might change lives in the DB (CMS/settings). Numbers that can be
   computed (counts, ratings, prices) are computed.
4. **Deliver separate files, never a zip.** For every file:
   - the **first line is a comment with its path**, e.g. `// src/server/actions/bookings.js` (after nothing — for client
     files it goes *above* `"use client";`, which is allowed);
   - say **exactly where it goes** and whether it is **NEW** or **replaces** an existing file;
   - group files by folder. Many files are named `page.jsx`, so name the full folder for each one.
5. **Always give full files**, not "…rest unchanged" snippets, unless the owner asks for a snippet.
6. **End every batch with numbered setup steps**: packages to install, `npm run db:push` (if the schema changed),
   any script to run (`db:content`, `db:seed`), env vars to add, and "restart `npm run dev`".
7. **Keep explanations short and plain.** The owner reads the summary, not the code.
8. **After each batch, give the Progress-log row** for §10 of this file (or send the updated file).

**Lesson learned (5 Nov):** the owner once missed pasting 9 files from an earlier batch, which caused
`Module not found: '@/server/errors'`. When something "can't be resolved" or behaves like an old version, ask the owner to
zip the project (without `node_modules`, `.next`, `.env.local`) and compare it file by file before changing code.

---

## 2. Golden rules (code)

1. JavaScript only. JSDoc comments are fine.
2. Never break the business model: two roles only; no provider dashboard/app; **never show a provider's phone/email to
   customers** ("a vetted Sorted pro"); booking messages are customer ↔ Sorted team only.
3. Don't redesign. Use the design system (§6) and the components in `src/components/ui` and `src/components/admin/ui.jsx`.
   No new UI libraries (shadcn, MUI, Chakra, DaisyUI, Bootstrap…). No green brand colour.
4. Don't rename/move files unless needed; if you do, list every import to update.
5. Keep `npm run build` green. Mind the Next 16 rules in §4.
6. Server Components by default. `"use client"` only for state/effects/handlers/browser APIs. Never pass plain functions from
   a Server Component to a Client Component (Server Actions are fine).
7. Secrets stay on the server. Only `NEXT_PUBLIC_*` in client code.
8. Never trust the browser: prices are recalculated on the server (`priceBooking()`), every Server Action re-checks the
   session/role, every input is validated with zod.
9. Money: `money()` / `money2()`; dates: `formatDate()` / `src/lib/dates.js`; DB money is `numeric(10,2)` dollars incl. GST.
10. Copy style: sentence case, plain words, no ALL-CAPS labels, no emoji, no fake urgency. Buttons say what happens.
11. Must work at **390px** wide with no horizontal scroll.

---

## 3. Run the project

```bash
npm install
copy .env.example .env.local     # then fill in DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_SITE_URL
npm run db:push                  # create/update tables from src/db/schema.js (run after any schema change)
npm run db:seed                  # starter data into an EMPTY db.  `npm run db:seed -- --reset` WIPES everything (dev only)
npm run db:content               # add starting page text + settings to an existing db; never overwrites edits; safe to re-run
npm run user:password -- --email you@x.com --password "min 8 chars" --admin --name "You"   # make/set an admin login
npm run dev                      # http://localhost:3000   (GET /api/health checks the DB)
npm run build                    # production build check
npm run format                   # Prettier (printWidth 130)
npm run db:studio                # browse the DB
```

- Public site `/` · customer area `/account` · admin panel `/admin`.
- Admins can only be created with `user:password … --admin`, or by an Owner in Admin › Settings › Team.
- `set-password` does **not** unblock a blocked account (unblock in Admin › Customers).
- Password-reset links are printed in the terminal until an email provider is added.

**Env vars** (`.env.example`): `DATABASE_URL` (Neon **pooled** URL), `NEXT_PUBLIC_SITE_URL` (also Better Auth's base URL —
must match the URL in the browser), `AUTH_SECRET` (32+ chars, required), optional `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
(redirect URI `/api/auth/callback/google`). `STRIPE_*` placeholders are unused until payments are chosen.

---

## 4. Tech notes that trip up AI models

- **Next 16:** `params` and `searchParams` are **Promises** — always `const { slug } = await params;` (pages, layouts,
  `generateMetadata`, route handlers).
- **Middleware is `src/proxy.js`** (`export function proxy(request)`, matcher `/account/:path*`, `/admin/:path*`). It only
  checks that a session cookie exists; the real checks are `requireUser()` / `requireAdmin()` in layouts and `getAdmin()` /
  `getCurrentUser()` in every Server Action. Don't create `middleware.js`.
- **No `next lint`** in Next 16 and no ESLint installed. Use `npm run format`.
- **Tailwind v4:** tokens in `@theme { … }` in `src/app/globals.css`; no `tailwind.config.js`. `--color-ink-900` → `bg-ink-900`.
- **Path alias** `@/` → `src/`.
- **Public pages are `force-dynamic`** (set in `app/(site)/layout.jsx`); the admin layout is dynamic too. Queries are wrapped
  in React `cache()` so repeated calls in one request hit the DB once. After a mutation, actions call
  `revalidatePath("/", "layout")` (public content) or the specific admin path.
- **`server-only`:** `src/db/index.js`, `src/server/**` and `components/site/server-sections.jsx` import `"server-only"`.
  Never import them in a `"use client"` file. Client components receive props or call Server Actions.
- **Server Actions** live in `src/server/actions/*.js` with `"use server"` at the top; files may only **export async
  functions**. They return `{ ok, error?, fieldErrors?, …data }`. Errors are logged with `logError(tag, err)` from
  `src/server/errors.js` (prints a "run `npm run db:push`" hint when a table/column is missing).
- **Calling actions from the client:** `useServerForm(action)` (`components/ui/use-server-form.js`) for `<form>`s, or
  `useTransition` + `await action(data)` then `router.refresh()`. This avoids React 19 resetting fields on error.
- **zod v4:** `z.email()`, `{ error: "message" }` (not `message:`), `z.discriminatedUnion`.
- **Better Auth:** call `auth.api.*` with `headers: await headers()`; `nextCookies()` plugin sets cookies. Don't use the
  `revokeOtherSessions: true` option on change-password (logs the page out) — call `auth.api.revokeOtherSessions` after.
  `role`, `blocked`, `teamRole` are `input: false` (can't be set at sign-up). No cookie cache, so role changes apply at once.
- **DB URL:** `src/db/url.js` rewrites `sslmode=require` → `verify-full` and drops `channel_binding` (silences pg warnings).
- **Dates:** booking dates are `"YYYY-MM-DD"` strings in Hobart time. Use `todayISO`, `addDaysISO`, `formatISODate`,
  `weekdayShort`, `weekdayIndex`, `isISODate`, `hobartToUTC(date, "HH:MM:SS")`. Never `new Date("2026-11-05")`.
  Date inputs that edit a timestamp convert with `new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Hobart" })`.
- **Client components get slim data:** pass `toCard(category)` (catalog.js), not full rows.
- **`Tabs` unmounts inactive tabs.** Editors keep their form state in the parent so switching tabs keeps unsaved edits. Tab
  buttons are `type="button"`.
- **Removing packages/extras used by past bookings sets `active=false`** instead of deleting.
- **Admin lists** (bookings, customers, payments) filter/sort/page on the server via URL params
  (`components/admin/use-query-state.js`, `pager.jsx`, `PAGE_SIZE` 50). Providers/inbox/reviews filter on the client.
- **CSV downloads** use `csvResponse()` in `src/server/csv.js` (escapes formula injection).
- **Images:** the `Photo` component is a plain `<img>`; `src` is an Unsplash id (`photo-…`) or a full `https://` URL. No
  uploads yet.
- **Fonts:** `@fontsource-variable/instrument-sans` imported in `src/app/layout.jsx` (not `next/font/google`).
- **Scripts in `src/db/*.js`** run under `tsx`, use relative imports (no `@/`), and load `.env.local` with
  `import { loadEnvConfig } from "@next/env"`. No top-level `await` — wrap in `main()`.

---

## 5. File map

```
.env.example · .prettierrc · drizzle.config.js · next.config.mjs · jsconfig.json · postcss.config.mjs · package.json
AI_CONTEXT.md (this file) · START-HERE.md (how to open a new chat + next batch)

src/
  proxy.js                     cookie check for /account/* and /admin/*
  app/
    layout.jsx                 <html lang="en-AU">, font, title template "%s · Sorted"
    globals.css                design tokens, .container-x, .tabular, .settle animations
    not-found.jsx
    api/auth/[...all]/route.js Better Auth handler     api/health/route.js  → { ok, db }

    (site)/                    PUBLIC — layout.jsx: header, footer, "Top bar" banner, force-dynamic
      page.jsx                 Home. All copy/steps/photos/section order from settings "homepage"; "Home hero" banner
      [slug]/page.jsx          Custom CMS pages (e.g. /careers) when published. Built-in routes always win
      services/page.jsx        ServiceBrowser          services/[slug]/page.jsx  PackagePicker, "Service pages" banner
      book/[slug]/page.jsx     BookingFlow (checkout)  book/success/page.jsx
      about, areas, offers, how-it-works, guarantee, help, contact, partners, blog, blog/[slug], terms, privacy
                               → header text + body blocks from the `pages` table (getPage / pageMetadata)
      account/                 layout (AccountNav) · page · bookings · bookings/[id] · addresses · profile
    (auth)/                    layout (split photo) · login · register · forgot-password · reset-password
    admin/                     layout: requireAdmin + live sidebar counts, AdminShell
      page.jsx                 dashboard
      bookings/ (list, new, [id] = BookingManager, export/route.js)
      providers/ (list, new, [id])      customers/ (list, [id], export/route.js)
      services/ (list, new, [slug])     areas/   coupons/   payments/ (+ export/route.js = Xero CSV)
      reviews/  inbox/
      cms/page.jsx             CmsManager: Pages · Homepage · Banners · FAQs · Blog   (?tab=pages|home|banners|faqs|blog)
      cms/pages/[id]/page.jsx  ContentEditor. id = page id | "new" | built-in slug ("about"). ?type=post → blog post editor
      settings/page.jsx        SettingsView: Business · Booking rules · Notifications · Payments · Team  (?tab=…)

  components/
    ui/       button (Button, ButtonLink, buttonClass) · form (Input, Textarea, Select, Label, Field, Checkbox)
              interactive ("use client": Switch, Tabs, Segmented, Accordion, Modal, useToast) · photo (Photo)
              misc (Badge, Card, CardHeader, Avatar, Stars, EmptyState, Table, Th, Td, SectionHeading)
              status (BookingBadge, PaymentBadge, ProviderBadge) · use-server-form.js
    category-icon.jsx
    site/     header, footer, logo, hero-search, sections (ServiceCard, ServiceTile, TrustStripView, HowItWorks({steps}),
              ReviewWallView, CtaBandView, PageHero, PromoBanner, MoreLink — no data fetching),
              server-sections (async ReviewWall, TrustStrip, CtaBand — server only),
              blocks (Blocks, PageBody — renders CMS blocks), legal (LegalPage({page}) splits blocks at headings),
              service-browser, package-picker, booking-flow, booking-row, booking-actions (+ MessageThread),
              account-nav, address-dialog, auth-forms, profile-forms, forms (ContactForm, PartnerForm), suburb-checker
    admin/    shell, ui (AdminHeader, StatCard, BarChart, ContactButtons, FilterTabs, FilterSelect, SearchInput),
              use-query-state.js, pager, bookings-table, booking-manager (+ AssignPanel), new-booking-form,
              customers-table, customer-details, providers-table, provider-form, inbox, reviews-manager,
              service-editor, areas-manager, coupons-manager, payments-view, bookable-switch (ActionSwitch),
              cms-manager (+ VariablesHint), content-editor, settings-view

  lib/        (safe in client + server)
    site.js        DEFAULT business details — only for the seed and as a fallback. Live values: settings "business"
    constants.js   bookingStatus, paymentStatus, providerStatus, bookingSteps, serviceGroups, weekdays, enquiryTypes,
                   experienceOptions, serviceIcons, couponRestrictions
    cms.js         builtInPages, isBuiltInPage, reservedSlugs, slugify, blockTypes, contentVariables, contentVars, fillVars,
                   homeSections, bannerPlacements, isImageRef
    dates.js       Hobart date helpers            utils.js  cn, money, money2, formatDate, initials, gstComponent

  db/
    schema.js            Drizzle schema (§8)        index.js  pg Pool + drizzle: import { db } from "@/db"
    url.js               normalises DATABASE_URL
    seed.js, seed-data.js       `npm run db:seed` (seed-data = starter catalogue, sample customers/bookings/reviews)
    content-defaults.js  starting homepage/page text + notification/payment defaults (seed, db:content, runtime fallback)
    content.js           `npm run db:content`
    set-password.js      `npm run user:password`

  server/     (server only)
    auth.js · session.js (getCurrentUser, requireUser, requireAdmin, getAdmin, safeNext, homeFor)
    email.js       sendEmail({ to, subject, text, event? }) — prints to terminal; `event` = "confirmation" | "cancellation"
                   is skipped when switched off in Settings › Notifications
    errors.js      logError(tag, err)        csv.js  csvResponse(filename, header, rows)
    pricing.js     priceBooking, checkCouponRules, discountFor, cents
    booking-rules.js  checkDateAllowed, slotStartTime, isValidSlot, hoursUntilSlot, lockBookings (advisory lock 724117),
                      slotHasRoom, nextReference (HD-#####), freeChangeHours
    queries/
      catalog.js        getCategories, toCard, getCategory, getPackagesFor, getAddOnsFor, getAreas, getPublishedReviews,
                        getRatingSummary, getCategoriesBySlugs, getSkillAndZoneOptions
      content.js        getPage(slug), pageMetadata(slug), getFaqs(section), getBanner(placement), getPublishedPosts,
                        getPublishedPost(slug), getLiveCoupons   ({variables} are filled in here)
      settings.js       getBusiness, getBookingRules, getImages, getOfferSettings, getNotificationSettings,
                        getPaymentSettings, getHomepage, getContentVars (all read site_settings, with fallbacks)
      account.js        getMyBookings, splitBookings, getMyBooking, getMySpend, getMyAddresses
      admin.js          dashboard, bookings (paged), booking detail + ranked provider candidates, customers, providers,
                        inbox, reviews, PAGE_SIZE
      admin-catalog.js  services, areas, coupons, payments overview/rows/ledger, payouts
      admin-content.js  listPagesAdmin, getPageForEdit, listPostsAdmin, getPostForEdit, getPostCategories,
                        getBannersAdmin, getFaqsAdmin, getTeam
    actions/   ("use server")
      checkout.js       applyCoupon, getSlotAvailability
      bookings.js       createBooking, rescheduleBooking, cancelBooking, submitReview, reportProblem, sendBookingMessage
      enquiries.js      submitEnquiry, submitPartnerApplication
      auth.js           signIn, signUp, requestPasswordReset, resetPassword, startGoogleSignIn, signOut
      account.js        updateProfile, updateNotificationPref, changePassword, saveAddress, deleteAddress,
                        makeDefaultAddress, deleteAccount
      admin-bookings.js assignProvider, unassignProvider, updateProviderPay, setBookingStatus, recordPayment,
                        updateBookingDetails, adminCancelBooking, addBookingNote, sendTeamMessage, logJobSheetSent,
                        notifyCustomerAssigned, emailInvoice, createAdminBooking
      admin-people.js   updateCustomer, setCustomerBlocked, sendCustomerPasswordReset, saveProvider, replyToEnquiry,
                        setEnquiryStatus, setApplicationStatus, setReviewStatus, saveReviewReply
      admin-catalog.js  saveService, setServiceBookable, saveZone, setZoneActive, saveSuburb, saveCoupon, setCouponActive,
                        createPayouts, setPayoutStatus, sendPaymentReminder
      admin-content.js  savePage, deletePage, saveHomepage, saveBanner, deleteBanner, saveFaq, deleteFaq, moveFaq,
                        savePost, deletePost
      admin-settings.js saveBusiness, saveBookingRules, saveNotifications, savePaymentSettings,
                        addAdmin, setTeamRole, removeAdmin (team changes: Owners only; last Owner protected)
```

Naming: kebab-case files; components are **named exports**; pages `export default` and export `metadata` or
`generateMetadata`.

---

## 6. Design system

**Look:** clean, photo-led, like Airbnb/Stripe/Urban Company. Navy for text and primary actions, hi-vis orange for the one
most important action. White and cool-grey surfaces. **No green, no decorative gradients, no emoji, no ALL-CAPS eyebrows.**

**Font:** Instrument Sans Variable; headings 600 weight, tight letter-spacing. `.tabular` for prices in tables.

| Token | Hex | Use |
| --- | --- | --- |
| `ink-900` | `#121a33` | text, primary buttons, dark sections |
| `ink-950` | `#0b1124` | footer |
| `ink-50…800` | navy-grey scale | borders, tints, secondary text |
| `brand-500` | `#ff6b1a` | accent CTA (text on it is `text-ink-950`) |
| `brand-50…800` | orange scale | admin counts, promo banner pill, focus ring |
| `paper` / `surface` | `#f5f6f8` / `#fff` | alt section bg / cards |
| `muted` / `subtle` | `#5a6280` / `#8d93aa` | secondary / tertiary text |
| `line` / `line-strong` | `#e4e6ed` / `#cfd3de` | borders |
| `star` | `#f5a524` | rating stars only |
| `success`, `info`, `warn`, `danger` (+`-50`) | | status colours |

Buttons: `variant` = `primary` (default) · `accent` (max one per region) · `outline` · `ghost` · `subtle` · `danger` ·
`inverse`; `size` = `sm` · `md` · `lg` · `icon`. Badge tones: `neutral` `success` `brand` `info` `warn` `danger`.
Radii: buttons/inputs 10px, cards 16px (`--radius-card`), big photos 24–28px. Shadows: `--shadow-lift`, `--shadow-float`.
Layout: sections in `container-x`, spacing `py-16 sm:py-24`. Grid children that hold text need `min-w-0`.
Admin: light sidebar, `AdminHeader` on every page, data in `Card` + `Table`, confirmations in `Modal`, feedback via
`useToast`, errors as `<p role="alert" className="text-sm text-danger">`.

---

## 7. Business rules already built

- **Booking statuses:** `new` → `assigned` → `confirmed` → `in_progress` → `completed`, or `cancelled`.
  **Payment statuses:** `unpaid`, `partial`, `paid`, `refunded`.
- **Checkout (`createBooking`)**: server-priced; slot capacity checked under an advisory lock
  (`maxJobsPerSlot`, 0 = unlimited); sequential `HD-#####` refs; coupon usage counted atomically and restrictions enforced
  (`anyone` / `first_booking` / `once_per_customer`, per-service); guests get a customer record and an optional
  set-password email; an existing email attaches the booking to that account; blocked/admin emails refused.
- **Dates allowed:** from today + `ceil(minNoticeHours/24)` days to today + `windowDays`; Sundays only if `sundays`.
- **Customer changes:** reschedule/cancel online until `freeCancelHours` before the window starts, then "please call".
  Rescheduling an assigned booking releases the pro (back to `new`). One review per booking (starts `pending`).
  "Report a problem" creates an Inbox complaint.
- **Provider matching** (`AssignPanel`): skills include the service; filters for zone, weekday availability, active status;
  sorted by match, fewest jobs that day, rating; compliance flags (ABN, insurance, police check, licence if required).
- **Payouts** are generated from completed, assigned jobs not yet in a payout; mark paid / hold / undo.
- **Content `{variables}`** in any page text, FAQ, banner, homepage copy or post: `{business_name} {phone} {email} {abn}
  {city} {region} {hours} {free_cancel_hours} {late_fee} {guarantee_hours} {invoice_days}`. Unknown `{words}` are left as-is.
- **Built-in pages** (`lib/cms.js builtInPages`: /services /areas /offers /how-it-works /guarantee /about /help /contact
  /partners /blog /terms /privacy) are always live, can't be deleted, URL fixed. Custom pages need a non-reserved slug.
- **Banners:** one per placement — the newest active one inside its dates. Placements: Top bar, Home hero, Service pages.
- **Blog:** publish date empty = now; a future date schedules; same date keeps the original time.
- **Team:** only Owners add/promote/change roles/remove; you can't remove yourself; there's always at least one Owner;
  removing access signs the person out (account stays as a customer).
- **Emails:** automatic "booking received" and "booking cancelled (by admin)" can be switched off; "new booking" alert goes
  to the business email if switched on; emails an admin sends by hand (updates, invoices, pro assigned, reminders) always go.

---

## 8. Database (`src/db/schema.js`)

Enums: `role` (customer, admin) · `booking_status` · `payment_status` · `provider_status` (onboarding, active, paused,
inactive) · `pay_type` (per_job, hourly, commission) · `payout_status` (pending, paid, held) · `publish_status` (draft,
published, archived) · `review_status` (pending, published, hidden) · `coupon_type` (percent, fixed) · `enquiry_status`
(open, replied, closed) · `application_status` (new, reviewing, approved, rejected).

Tables (key columns):
- `users` id(text), name, email(unique), emailVerified, phone, image, role, blocked, marketingOptIn, notifySms, notifyEmail,
  teamRole, adminNotes · `sessions`, `accounts` (password hash, providerId "credential"|"google"), `verifications` (Better Auth)
- `addresses` userId, label, line1, line2, suburbId, accessNotes, isDefault
- `zones` name, active, sortOrder · `suburbs` name, postcode, zoneId, surcharge, active
- `categories` slug, name, group, icon, short, description, priceUnit, includes(jsonb), faqs(jsonb), heroImage, seoTitle,
  seoDescription, sortOrder, featured, status · `packages` categoryId, name, summary, price, priceUnit, duration, includes,
  popular, active, sortOrder · `add_ons` categoryId, name, price, active
- `providers` name, business, email, phone, abn, status, payType, payRate, payoutSchedule, availability(jsonb), rating,
  bankBsb, bankAccount, notes · `provider_skills` · `provider_zones` · `provider_documents` type, fileUrl, expiresOn, verified
- `bookings` reference, userId, categoryId, packageId, providerId, status, paymentStatus, addressLine, suburbId, accessNotes,
  serviceDate, timeSlot, subtotal, discount, surcharge, total, providerPay, couponCode, payoutId, customerNotes, internalNotes
- `booking_add_ons` (price snapshot) · `booking_events` type (created|assigned|status|payment|note|message_customer|message_team)
- `payments` bookingId, provider, providerRef, amount, status · `payouts` providerId, periodStart/End, amount, jobs, status, paidAt
- `reviews` bookingId (unique), userId, categoryId, authorName, authorSuburb, rating, body, reply, status, featured
- `coupons` code, description, type, value, minSpend, usageLimit, usedCount, categoryIds, restriction, expiresAt, active
- `pages` slug ("/about"), title, **intro**, blocks(jsonb), seoTitle, seoDescription, status
- `posts` slug, title, excerpt, body (legacy), blocks, coverImage, category, status, publishedAt
- `banners` text, link, placement, active, startsAt, endsAt · `faqs` question, answer, section (general|payments), categoryId, sortOrder
- `enquiries` (+ replies jsonb) · `partner_applications` · `activity_log` actorId, actorName, message
- `site_settings` key → value(jsonb):
  `business` {name, tagline, description, abn, phone, email, address, hours, city, region, social{facebook,instagram}} ·
  `booking` {minNoticeHours, windowDays, freeCancelHours, lateCancelFeePercent, guaranteeHours, maxJobsPerSlot, sundays,
  timeSlots[]} · `images` {hero, cleaner, kitchen, livingRoom…} · `offers` {seasonal[slugs], seasonalTitle, seasonalText} ·
  `homepage` {heroTitle, heroText, heroBadge, popularTitle/Text, howTitle/Text, steps[{title,body}], teamTitle/Text,
  teamPoints[], reviewsTitle/Text, areasText, faqTitle, ctaTitle/Text, sections[{id,visible}]} ·
  `notifications` {jobSheetTemplate, emails{confirmation,cancellation}, adminNewBooking} · `payments` {invoiceDays}

Content blocks (pages + posts): `heading|text|quote {id,type,text}` · `image {src,alt}` · `cta {text,href}` ·
`cards {style:"numbered"|"ticks", items:[{title,body}]}`.

**Schema changes:** edit `schema.js`, tell the owner to run `npm run db:push`, update this section. Starting content goes in
`seed-data.js` / `content-defaults.js` (and `db:content` if existing databases need it).

---

## 9. Checklist before handing back code

- [ ] JS only · two roles · no provider details shown to customers · existing components/tokens only
- [ ] `await params/searchParams` · `"use client"` only where needed · no server-only imports in client files
- [ ] Every action: auth check, zod validation, `{ ok, error }`, `logError`, activity log for admin changes, revalidate
- [ ] Nothing fake: every button works or is removed; no mock data; no hardcoded business text
- [ ] Works at 390px; images have `alt` (`""` if decorative)
- [ ] `npm run build` passes (and test the flows if you can run them)
- [ ] Every file starts with its path comment; delivered as separate files with NEW/replace + destination
- [ ] Setup steps listed (installs, `db:push`, scripts, env vars, restart) · Progress-log row given

---

## 10. Progress log (newest first)

| Date | Change | Next |
| --- | --- | --- |
| 2026-11-05 | **Fix:** owner's project was missing 9 Batch 3 files (`server/errors.js` + 8 older versions: booking-flow, actions/account, checkout, auth, enquiries, queries/account, book/success, account/bookings/[id]) → "Module not found". Re-sent; verified the owner's zip builds. | — |
| 2026-11-05 | **Batch 6: website content + settings.** Admin › Content (pages incl. custom pages, homepage editor, banners with dates, FAQs, blog with scheduling, block editor incl. cards). Admin › Settings (business, booking rules incl. guarantee hours + arrival windows, notification switches, invoice terms, team management). All public wording from DB with `{variables}`. `pages.intro` column, `npm run db:content`, `src/lib/data.js` deleted. | Batch 7 |
| 2026-11-04 | **Batch 5: catalogue & money.** Services + editor, areas, promo codes (restrictions), payments (paged, reminders, Xero CSV), payouts. | |
| 2026-11-04 | **Batch 4: admin operations.** Dashboard, bookings list/manager, phone bookings, customers, providers, inbox, reviews, header search + bell. | |
| 2026-11-04 | **Batch 3: real bookings.** createBooking, reschedule/cancel, reviews, report a problem. | |
| 2026-11-04 | **Batch 2: auth + account area.** Better Auth, proxy.js, account pages, `user:password`. | |
| 2026-11-04 | **Batch 1: DB + public site.** Drizzle/pg, seed, queries, forms save to DB, `/api/health`. | |
| 2026-11-03 | UI v1 + v2 (Sorted branding) on mock data. | |

### Status

| Area | Status |
| --- | --- |
| Public site, customer account, admin panel | ✅ All on the database |
| Auth (customer/admin, Google optional) | ✅ |
| Bookings, reschedule/cancel, reviews, complaints | ✅ |
| Admin operations, catalogue, coupons, payments records, payouts | ✅ |
| CMS + settings + admin team | ✅ |
| **Email + SMS sending** | ⬜ Next (Batch 7) |
| **File uploads** (provider docs, service/CMS images, problem photos) | ⬜ |
| **Card payments** | ⏸ Waiting on the owner's choice of provider |
| **Deploy** (Vercel + Neon, Sydney region, domain, env vars) | ⬜ |
| Pre-launch content (real business details, real reviews, lawyer-checked terms) | ⬜ Owner |

---

## 11. Open decisions and placeholders

- **Card payment provider — owner said "we'll discuss later".** Compared 4 Nov 2026 (AU domestic cards, online):
  Stripe 1.7% + 30c · Pin Payments from 1.6% + 30c · Airwallex 1.65% + 30c · Zeller 1.75% + 25c · Square online 2.2%.
  Don't implement any provider until the owner chooses. Plan when chosen: authorise at booking, capture after the job,
  webhook updates `payments` + `bookings.paymentStatus`, keep "pay after the job"; settings go in Settings › Payments;
  checkout's card option is currently shown disabled in `booking-flow.jsx`.
- **Email/SMS providers not chosen** (suggestions: Resend or Postmark for email; MessageMedia, ClickSend or Twilio for SMS —
  Australian sender IDs). Ask the owner before adding a paid service.
- Business details are placeholders — edit in Admin › Settings › Business.
- Reviews in `seed-data.js` are **sample text** — delete before launch (Australian Consumer Law bans fake testimonials).
- Terms/Privacy are template text — need a lawyer's review (Admin › Content › Pages).
- Photos are Unsplash ids/URLs until uploads exist.
- Removed on purpose until they can work: logo upload, SMS switches, deposit option, GST switch, payment-gateway picker.
- Test logins used during development (local seed only): admin `rachel@sorted.com.au` / `AdminPass123`,
  customer `sophie.m@example.com` / `testpass123` — set with `npm run user:password`.