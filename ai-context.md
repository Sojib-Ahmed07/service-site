# AI_CONTEXT.md — Sorted (home services website)

> **For any AI assistant (Claude, ChatGPT, Gemini, DeepSeek, Copilot, Cursor, etc.):**
> This file is the single source of truth for this project. Read it fully before writing any code.
> It lets work continue from any chat, on any model, starting at any feature.
> The project owner will paste this file at the start of a new chat, then describe the task.
>
> **Your first reply in a new chat should:** (1) confirm you've read this file in one or two lines, (2) restate the task,
> (3) list the files you plan to create or change, and (4) ask for the current contents of any file you need to edit
> that you haven't been shown. **Never guess the contents of an existing file. Ask for it.**

---

## 0. Quick facts (read this if you read nothing else)

| Item | Value |
| --- | --- |
| Product | **Sorted**: a home-services booking website (like Urban Company, Sheba.xyz, Jim's Group, Airtasker) |
| Tagline | "Home services, sorted." |
| Location | Greater Hobart, Tasmania, Australia (currency **AUD**, prices **include GST**, timezone **Australia/Hobart**, locale **en-AU**) |
| Business model | **Middleman.** The company lists services at fixed prices. Customers book and pay the company. The admin assigns a provider (worker) offline by phone/SMS/email. **Customers and providers never interact through the site.** |
| Roles | **Exactly two login roles: `customer` and `admin`.** There is **no provider/worker login.** Providers are records the admin manages. |
| Language | **JavaScript only** (`.js`, `.jsx`). **No TypeScript**: no `.ts`/`.tsx`, no `tsconfig.json`, no type annotations, no `@types/*`. |
| Framework | **Next.js 16** (App Router), **React 19** |
| Styling | **Tailwind CSS v4** (CSS-first config in `src/app/globals.css`, **no `tailwind.config.js`**) |
| Icons | `lucide-react` |
| Database | **Neon Postgres + Drizzle ORM**, connected with `pg` (node-postgres). Schema in `src/db/schema.js`, seed in `src/db/seed.js` |
| Data today | **Everything reads the database except Admin › Content (CMS) and Admin › Settings**, which still use mock data from `src/lib/data.js` (batch 6) |
| Auth | **Better Auth** (email + password, optional Google) in `src/server/auth.js`. Sessions in DB, route protection in `src/proxy.js` + `requireUser`/`requireAdmin` |
| Payments | **Not built yet.** Checkout has a marked placeholder. "Pay after the job" option exists. Planned: Stripe (or Square/Tyro) |
| Package manager | npm |
| Node | 20.9+ |

---

## 1. Golden rules (follow before ANY change)

1. **JavaScript only.** Never create `.ts`/`.tsx` files, never add TypeScript, JSDoc types are fine but optional.
2. **Never break the business model.**
   - Only two roles: `customer`, `admin`.
   - No provider dashboard, provider login, provider app, or customer↔provider chat.
   - Never show a provider's phone/email to customers. Customers see "a vetted Sorted pro". Messaging on a booking is **customer ↔ Sorted team** only.
3. **Don't redesign.** Keep the existing design system (section 5). No new UI libraries (no shadcn, MUI, Chakra, Bootstrap, DaisyUI, Ant). No green brand colours. Reuse components in `src/components/ui` and `src/components/admin/ui.jsx`.
4. **Don't rename or move files** unless the task requires it. If you must, list every import that needs updating.
5. **Small, complete changes.** Give full file contents for new files. For edits, give the full updated file **or** clearly marked before/after snippets with enough surrounding lines to find the spot. Never output "…rest of file unchanged" inside code that the user will paste as a whole file.
6. **Ask, don't guess.** If you need an existing file's current contents, ask for it. If a requirement is ambiguous and expensive to redo, ask one short question first.
7. **Keep the build green.** Code must pass `npm run build`. Mind Next 16 rules (section 3).
8. **Server vs client components.** Pages are Server Components by default. Add `"use client"` only to components using state, effects, event handlers or browser APIs. Never pass functions from a Server Component to a Client Component as props (except Server Actions).
9. **Secrets stay server-side.** Only `NEXT_PUBLIC_*` env vars may be used in client code. Never put DB URLs, auth secrets or payment secret keys in client components.
10. **Money and dates:** use `money()` / `money2()` and `formatDate()` from `src/lib/utils.js`. Store money in the DB as `numeric(10,2)` (dollars, GST-inclusive). Use the `Australia/Hobart` timezone.
11. **Copy style:** sentence case, plain words, active voice. No ALL-CAPS labels, no emoji in UI, no fake urgency. Buttons say what happens ("Book a service", "Assign", "Save changes").
12. **After finishing a task**, tell the user to update section 10 (Progress log) of this file, and give them the exact lines to add.

---

## 2. Run the project

```bash
npm install
cp .env.example .env.local    # Windows: copy .env.example .env.local  → add DATABASE_URL
npm run db:push               # create/update tables from src/db/schema.js
npm run db:seed               # load starter data (once). `npm run db:seed -- --reset` wipes and reseeds (dev only)
npm run user:password -- --email you@x.com --password "min 8 chars" --admin --name "You"   # create/set an admin login
npm run dev                   # http://localhost:3000   (GET /api/health checks the DB)
npm run build                 # production build check
npm run format                # Prettier (printWidth 130)
```

- Customer site: `/` • Admin panel: `/admin` (admins only)
- Logins: admins are made only with `npm run user:password -- … --admin`. Seeded customers/admins have no password until you set one with that command or "Forgot your password?".
- No email provider yet: emails (password reset links) are printed in the server terminal by `src/server/email.js`.

Env vars (`.env.example`): `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` (also Better Auth's base URL; must match the URL you browse), `AUTH_SECRET` (required, 32+ chars), optional `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

---

## 3. Tech notes that trip up AI models

- **Next.js 16:** `params` and `searchParams` in pages/layouts/`generateMetadata` are **Promises**. Always:
  ```js
  export default async function Page({ params, searchParams }) {
    const { slug } = await params;
    const { tab = "x" } = await searchParams;
  }
  ```
- **Middleware is now `proxy.js`** in Next 16 (`src/proxy.js`, export `function proxy(request)` + `config.matcher`). Don't create `middleware.js`.
- **`next lint` is removed** in Next 16. There is no lint script; use `npm run format`.
- **Tailwind v4:** tokens are defined with `@theme { --color-...: ...; }` in `globals.css`. A token `--color-ink-900` becomes classes `bg-ink-900`, `text-ink-900`, etc. There is no `tailwind.config.js`. PostCSS uses `@tailwindcss/postcss` (`postcss.config.mjs`).
- **Path alias:** `@/` → `src/` (defined in `jsconfig.json`).
- **Data loading:** public pages are `force-dynamic` (set in `app/(site)/layout.jsx`), so they read live DB data on every request. Query helpers are wrapped in React `cache()` to dedupe within a request.
- **`server-only`:** `src/db/index.js`, `src/server/queries/*`, `src/server/pricing.js` and `components/site/server-sections.jsx` import `"server-only"`. Never import them from a `"use client"` file. Client components get data as props, or call Server Actions in `src/server/actions/*`.
- **Admin lists** (bookings, customers) filter/sort/page on the server via URL params (`components/admin/use-query-state.js`, `pager.jsx`). Providers, inbox and reviews load fully and filter on the client (small tables).
- **Client components get slim data:** pass `toCard(category)` (catalog.js) to client components, not full category rows (FAQs etc.).
- **Removing packages/extras** used by past bookings sets `active = false` instead of deleting, so booking history keeps its items.
- **Admin Server Actions** check `getAdmin()` first and log to `activity_log` + `booking_events`.
- **Auth in Server Actions:** call `auth.api.*` with `headers: await headers()`; the `nextCookies()` plugin sets cookies. Don't use Better Auth's `revokeOtherSessions: true` option on change-password (it swaps the current session mid-request and logs the page out) — call `auth.api.revokeOtherSessions` after instead.
- **DB URL:** `src/db/url.js` rewrites `sslmode=require` → `verify-full` (same security, no pg warning) and drops `channel_binding`.
- **Dates:** booking dates are plain `"YYYY-MM-DD"` strings in Hobart time. Use `src/lib/dates.js` (`todayISO`, `addDaysISO`, `formatISODate`, `weekdayShort`, `hobartToUTC`). Never `new Date("2026-11-05")` (that is UTC midnight and shifts the day).
- **Fonts:** loaded from npm (`@fontsource-variable/instrument-sans`) in `src/app/layout.jsx`, not from `next/font/google`.
- **Images:** service photos use the `Photo` component (`src/components/ui/photo.jsx`), a plain `<img>` with an Unsplash id or full URL and a grey fallback on error. Remote hosts for `next/image` are listed in `next.config.mjs` (`images.unsplash.com`).
- **Route groups:** `(site)` = public pages with header/footer, `(auth)` = login/register split layout. Parentheses don't appear in URLs.
- Config files are JS: `next.config.mjs`, `drizzle.config.js`, `postcss.config.mjs`, `jsconfig.json`, `.prettierrc`.

---

## 4. File map

```
AI_CONTEXT.md               ← this file
README.md                   human setup guide
.env.example                env var template
drizzle.config.js           Drizzle Kit config (schema: ./src/db/schema.js, out: ./drizzle)
next.config.mjs             images.remotePatterns
jsconfig.json               "@/*" → "./src/*"

src/
  app/
    layout.jsx              <html lang="en-AU">, font import, global metadata (title template "%s · Sorted")
    globals.css             DESIGN TOKENS (colours, fonts, radii, shadows, .container-x, .tabular, .settle animation)
    not-found.jsx           404

    (site)/                 PUBLIC SITE — layout.jsx adds SiteHeader + SiteFooter + top banner
      page.jsx              Home: hero + search, service strip, most booked, how it works, "one team" band, reviews, areas, FAQ, CTA
      services/page.jsx     All services (ServiceBrowser: group filter + search). ?q= ?group= ?suburb=
      services/[slug]/page.jsx  Service detail: photo hero, PackagePicker (packages, extras, sticky summary), includes, reviews, FAQ, related
      book/[slug]/page.jsx  Checkout (BookingFlow). ?pkg= ?addons=a,b ?suburb=
      book/success/page.jsx Confirmation. ?ref= ?service= ?date= ?slot=
      how-it-works, guarantee, about, areas (SuburbChecker), offers, help, contact (ContactForm, ?type=complaint),
      partners (PartnerForm), blog, blog/[slug], terms, privacy (LegalPage)
      account/              CUSTOMER AREA (layout.jsx = sidebar AccountNav)
        page.jsx            Overview: next booking, recent bookings, book again
        bookings/page.jsx   Upcoming + past
        bookings/[id]/page.jsx  Detail: progress steps, details, BookingActions (reschedule/cancel/review/report), MessageThread, payment summary
        addresses/page.jsx  Saved addresses (AddressDialog)
        profile/page.jsx    Details, notification prefs, password, delete account

    (auth)/                 layout.jsx = split screen with photo
      login, register, forgot-password   (forms in components/site/auth-forms.jsx)

    admin/                  ADMIN PANEL — layout.jsx wraps AdminShell (light sidebar + top bar)
      page.jsx              Dashboard: KPIs, unassigned jobs, revenue chart, today's schedule, top services, compliance alerts, activity
      bookings/page.jsx     BookingsTable (status tabs, service/zone filters, search, sort). ?status=new
      bookings/new/page.jsx NewBookingForm (manual phone bookings)
      bookings/[id]/page.jsx BookingManager — THE CORE SCREEN: status, job details, AssignPanel (find provider), money/margin, timeline, notes, messages
      providers/page.jsx    ProvidersTable (filter by service/zone/day/status). ?skill=<category-slug>
      providers/new, providers/[id]   ProviderForm + jobs + payouts
      customers/page.jsx, customers/[id]/page.jsx
      services/page.jsx     Services grouped, toggles, provider counts
      services/new, services/[slug]   ServiceEditor (tabs: Details, Packages, Extras, FAQs, SEO)
      areas/page.jsx        Zones + suburbs, travel fee, on/off
      coupons/page.jsx      CouponsManager
      payments/page.jsx     PaymentsView (customer payments, provider payouts, gateway status)
      reviews/page.jsx      ReviewsManager (publish/hide/reply)
      cms/page.jsx          CmsManager (tabs: Pages, Homepage, Banners, FAQs, Blog)
      cms/pages/[id]/page.jsx  ContentEditor (block editor). id="new" for new; ?type=post for blog posts
      inbox/page.jsx        AdminInbox (enquiries + partner applications)
      settings/page.jsx     SettingsView (tabs: business, booking, notifications, payments, team). ?tab=payments

  components/
    ui/                     SHARED PRIMITIVES (use these, don't recreate)
      button.jsx            Button, ButtonLink, buttonClass(variant,size,className)
      form.jsx              Input, Textarea, Select, Label, Field, Checkbox
      interactive.jsx       ("use client") Switch, Tabs, Segmented, Accordion, Modal, useToast
      misc.jsx              Badge, Card, CardHeader, Avatar, Stars, EmptyState, Table, Th, Td, SectionHeading
      photo.jsx             ("use client") Photo
      status.jsx            BookingBadge, PaymentBadge, ProviderBadge
    category-icon.jsx       CategoryIcon({ icon, size: "sm"|"md"|"lg" }) — lucide icon in neutral tile
    site/                   header, footer, logo (Logo, LogoMark), hero-search, sections (ServiceCard, ServiceGrid,
                            ServiceTile, TrustStripView, HowItWorks, ReviewWallView, CtaBandView, PageHero, MoreLink — no data),
                            server-sections (async ReviewWall, TrustStrip, CtaBand that load their own data — server only),
                            blocks (renders ContentEditor blocks),
                            service-browser, package-picker, booking-flow, booking-row, booking-actions (+ MessageThread),
                            account-nav, address-dialog, auth-forms, forms (ContactForm, PartnerForm), legal, suburb-checker
    admin/                  shell (AdminShell), ui (AdminHeader, StatCard, BarChart, ContactButtons, FilterTabs,
                            FilterSelect, SearchInput), bookings-table, booking-manager (+ AssignPanel), new-booking-form,
                            providers-table, provider-form, customers-table, service-editor, coupons-manager,
                            payments-view, reviews-manager, cms-manager, content-editor, inbox, settings-view

  lib/
    site.js                 DEFAULT business details, used only by the seed and as a fallback. Live values: site_settings "business"
    data.js                 MOCK DATA, still used by /account and /admin only (delete when those are migrated)
    constants.js            Status labels/tones (bookingStatus, paymentStatus, providerStatus), bookingSteps, serviceGroups, weekdays, enquiryTypes
    dates.js                Hobart-safe date helpers (client + server)
    utils.js                cn(), money(), money2(), formatDate(), initials(), gstComponent()
  db/
    schema.js               Drizzle schema (see section 7)
    index.js                pg Pool + drizzle (server only): import { db, schema } from "@/db"
    url.js                  normalises DATABASE_URL (used by index.js, seed.js, set-password.js, drizzle.config.js)
    seed.js / seed-data.js  `npm run db:seed` (seed-data.js = the old mock data)
    set-password.js         `npm run user:password` (create user / set password / --admin)
  proxy.js                  Next 16 proxy: no session cookie → /login?next=… for /account/* and /admin/*
  server/                   SERVER ONLY
    auth.js                 Better Auth config (drizzle adapter, email+password, Google if env set, blocked-user hook)
    session.js              getCurrentUser(), requireUser(next), requireAdmin(), safeNext(), homeFor()
    email.js                sendEmail() — logs to the terminal until a provider is added
    queries/account.js      getMyBookings, splitBookings, getMyBooking(userId, ref), getMySpend, getMyAddresses
    booking-rules.js        checkDateAllowed, slotStartTime, hoursUntilSlot, lockBookings (advisory lock), slotHasRoom, nextReference, freeChangeHours
    errors.js               logError(tag, err) — adds "run npm run db:push" hints for missing tables/columns
    csv.js                  csvResponse(filename, header, rows) — safe CSV downloads
    queries/admin-catalog.js   getServicesOverview, getServiceForEdit, getAreasAdmin, getCouponsAdmin, getPaymentsOverview,
                            listPaymentRows (paged), getPayoutsAdmin, getUnbatchedJobs, getPaymentLedger
    actions/admin-catalog.js   saveService (packages/extras/FAQs in one go), setServiceBookable, saveZone, setZoneActive,
                            saveSuburb, saveCoupon, setCouponActive, createPayouts, setPayoutStatus, sendPaymentReminder
    queries/admin.js        getAdminOptions, getProvidersFull (+compliance), getProviderById, getProviderActivity, listBookings (paged),
                            getAdminBooking (+ ranked candidates), getCustomerPicker, listCustomers (paged), getAdminCustomer,
                            getInbox, getAllReviews, getDashboard
    actions/admin-bookings.js  assignProvider, unassignProvider, updateProviderPay, setBookingStatus, recordPayment,
                            updateBookingDetails, adminCancelBooking, addBookingNote, sendTeamMessage, logJobSheetSent,
                            notifyCustomerAssigned, emailInvoice, createAdminBooking
    actions/admin-people.js updateCustomer, setCustomerBlocked, sendCustomerPasswordReset, saveProvider, replyToEnquiry,
                            setEnquiryStatus, setApplicationStatus (approve → creates onboarding provider), setReviewStatus, saveReviewReply
    queries/catalog.js      getCategories, getCategory(slug), getPackagesFor(cat), getAddOnsFor(cat), getAreas, getPublishedReviews, getRatingSummary, getCategoriesBySlugs
    queries/content.js      getFaqs(section), getBanner(placement), getPublishedPosts, getPublishedPost(slug), getLiveCoupons
    queries/settings.js     getBusiness, getBookingRules, getImages, getOfferSettings (site_settings + fallbacks)
    pricing.js              priceBooking() (DB prices only), checkCouponRules(), discountFor()
    actions/checkout.js     "use server": applyCoupon, getSlotAvailability
    actions/enquiries.js    "use server": submitEnquiry, submitPartnerApplication
    actions/auth.js         "use server": signIn, signUp, requestPasswordReset, resetPassword, startGoogleSignIn, signOut
    actions/account.js      "use server": updateProfile, updateNotificationPref, changePassword, saveAddress, deleteAddress, makeDefaultAddress, deleteAccount
    actions/bookings.js     "use server": createBooking (checkout), rescheduleBooking, cancelBooking, submitReview, reportProblem, sendBookingMessage
  app/api/auth/[...all]/route.js   Better Auth HTTP handler (reset links, Google callback)
  app/admin/bookings/export/route.js, app/admin/customers/export/route.js, app/admin/payments/export/route.js (Xero CSV)
  app/api/health/route.js   GET → { ok, db }
```

**Naming conventions:** files are kebab-case `.jsx` for components and `.js` for logic. Components are **named exports** (`export function BookingFlow`). Pages use `export default`. Each page exports `metadata` or `generateMetadata`.

---

## 5. Design system (keep it consistent)

**Look:** professional, clean, photo-led, like Airbnb / Stripe / Urban Company. Navy for text and primary actions, hi-vis orange for the single most important action. White and cool grey surfaces. **No green, no gradients as decoration, no emoji, no ALL-CAPS eyebrow labels, no "→" appended to button text.**

**Font:** Instrument Sans Variable (one family). Headings weight 600, letter-spacing about -0.028em (big hero up to -0.04em). Use `.tabular` for prices in tables.

**Colour tokens** (`src/app/globals.css`):

| Token | Hex | Use |
| --- | --- | --- |
| `ink` / `ink-900` | `#121a33` | Main text, primary buttons, dark sections, selected states |
| `ink-950` | `#0b1124` | Footer |
| `ink-50…800` | greys-navy scale | Borders, tints, secondary text (`ink-50` light bg tint, `ink-100`, `ink-300` text on dark, `ink-600/700` nav text) |
| `brand-500` | `#ff6b1a` | **Accent CTA** ("Book a service", hero Search). Text on it is `text-ink-950` (not white) |
| `brand-50…800` | orange scale | Admin counts (`bg-brand-50 text-brand-700`), active icon in admin nav, focus ring |
| `paper` | `#f5f6f8` | Alternate section background |
| `surface` | `#ffffff` | Body/cards |
| `muted` / `subtle` | `#5a6280` / `#8d93aa` | Secondary / tertiary text |
| `line` / `line-strong` | `#e4e6ed` / `#cfd3de` | Borders |
| `star` | `#f5a524` | Rating stars only (`fill-star text-star`) |
| `success`, `info`, `warn`, `danger` (+ `-50`) | | Status colours |

**Button variants** (`Button`/`ButtonLink` `variant`): `primary` (navy, default), `accent` (orange, max one per view region), `outline`, `ghost`, `subtle`, `danger`, `inverse`. Sizes: `sm`, `md`, `lg`, `icon`. Radius 10px.

**Badge tones:** `neutral`, `success`, `brand`, `info`, `warn`, `danger`.

**Radii:** buttons 10px, inputs 10px (`--radius-field`), cards 16px (`--radius-card`), big photos 24–28px.

**Shadows:** `shadow-[var(--shadow-lift)]` (cards/dropdowns), `shadow-[var(--shadow-float)]` (floating cards over photos).

**Layout:** wrap page sections in `container-x` (max-w-7xl with responsive padding). Section spacing `py-16 sm:py-24`. Must work at 390px width with no horizontal scroll.

**Motion:** only the hero's floating cards animate on load (`.settle`, `.settle-late`), with `prefers-reduced-motion` respected. Don't add scroll animations.

**Admin look:** light, white sidebar (`w-60`), page background `#f7f8fa`, `AdminHeader` at top of every page, data in `Card` + `Table`, filters via `FilterTabs` / `FilterSelect` / `SearchInput`, contact via `ContactButtons` (tel:/sms:/mailto: links).

**Photos:** `Photo` with `src` = Unsplash id like `"photo-1686178827149-6d55c72d81df"` or any full URL, plus `className` with an aspect ratio and radius, e.g. `className="aspect-[4/3] rounded-2xl"`. Service photos live in `categoryImages` in `data.js`; other images in `images`.

---

## 6. Data shapes the UI depends on

Query helpers return objects in these shapes (DB ids are converted to strings for packages/add-ons). The mock data in `src/lib/data.js` uses the same shapes.
From the DB: `category.rating` is the average of published reviews (null if none) and `category.reviews` the count; `fromPrice` is the cheapest active package; `popular` = `categories.featured`. Categories with no active package are hidden from the public site. `suburb` also has `id`.

```js
category  = { slug, name, icon, group: "Cleaning"|"Outdoor"|"Repairs & trades"|"Moving", short, description,
              fromPrice, priceUnit?: "/hr", popular?, rating, reviews, includes: string[], faqs: [{q,a}], image }
              // icon keys: cleaning lease pest carpet garden handyman gutter window electrical plumbing removals pressure
package   = { id, category /*slug*/, name, price, duration, summary, includes: string[], popular? }
addOn     = { id, category /*slug*/, name, price }
zones     = ["Hobart & inner","Northern suburbs","Eastern Shore","Kingborough","Huon Valley"]
suburb    = { name, postcode, zone, surcharge? }          // surcharge = travel fee in $
timeSlots = ["7:00–9:00am","9:00–11:00am","11:00am–1:00pm","1:00–3:00pm","3:00–5:00pm"]
provider  = { id, name, business, phone, email, skills: categorySlug[], zones: zoneName[], rating, jobs,
              status: "active"|"paused"|"onboarding"|"inactive", payType, rate, availability: ["Mon".."Sun"],
              docs: { abn, insurance, policeCheck, licence /* null = not required */ }, joined, notes? }
customer  = { id, name, email, phone, suburb, bookings, spent, joined, status: "active"|"blocked" }
booking   = { id /*"HD-24817"*/, customerId, category /*slug*/, packageId, addOns: id[], suburb, address,
              date /*YYYY-MM-DD*/, slot, status, payment, total, providerId?, providerPay?, notes?, createdAt }
review    = { id, name, suburb, rating, category, date, status: "published"|"pending"|"hidden", text }
coupon    = { code, type: "percent"|"fixed", value, minSpend, uses, limit, expires, active, description }
also: faqs, blogPosts, blogBody, cmsPages, banners, enquiries, partnerApplications, payouts,
      weeklyRevenue, activityLog, adminUsers, bookingMessages { [bookingId]: [{ from: "team"|"customer", text, at }] }, images
helpers: getCategory(slug), getPackage(id), getProvider(id), getCustomer(id), getBooking(id), getSuburb(name),
         packagesFor(slug), addOnsFor(slug), demoUser (= customers[0], the "logged-in" customer)
status metadata: bookingStatus, paymentStatus, providerStatus ({ label, customerLabel?, tone }), bookingSteps
```

**Booking statuses:** `new` (needs assigning) → `assigned` → `confirmed` → `in_progress` → `completed`, or `cancelled`.
**Payment statuses:** `unpaid`, `partial` (deposit), `paid`, `refunded`.

**The provider-matching rule** (implemented in `AssignPanel`, `components/admin/booking-manager.jsx`): candidates = providers whose `skills` include the booking's category. Then filter (each filter toggleable) by: zone covers the booking suburb's zone, `availability` includes the booking's weekday, `status === "active"`. Sort by zone + availability match, fewest other jobs that day, then rating. Flag document compliance. Keep this logic when moving to the DB (as a server query).

---

## 7. Database (Neon + Drizzle) — `src/db/schema.js`

Connected (node-postgres `pg` driver over TCP, works with Neon's pooled URL and local Postgres). Enums:

- `role`: customer, admin
- `booking_status`: new, assigned, confirmed, in_progress, completed, cancelled
- `payment_status`: unpaid, partial, paid, refunded
- `provider_status`: onboarding, active, paused, inactive
- `pay_type`: per_job, hourly, commission
- `payout_status`: pending, paid, held
- `publish_status`: draft, published, archived
- `review_status`: pending, published, hidden
- `coupon_type`: percent, fixed
- `enquiry_status`: open, replied, closed
- `application_status`: new, reviewing, approved, rejected

Tables (key columns):

- `users`: id (text, auth-library compatible), name, email (unique), emailVerified, phone, image, **role**, blocked, marketingOptIn, notifySms, notifyEmail, teamRole (admins: Owner/Operations/Support), adminNotes, timestamps
- `sessions`, `accounts` (passwords hashed in `accounts.password`, providerId "credential" | "google"), `verifications`: Better Auth tables
- `addresses`: userId → users, label, line1, line2, suburbId → suburbs, accessNotes, isDefault
- `zones`: name (unique), active, sortOrder
- `suburbs`: name (unique), postcode, zoneId → zones, surcharge, active
- `categories`: slug, name, group, icon, short, description, priceUnit, includes (jsonb), faqs (jsonb), heroImage, seoTitle, seoDescription, sortOrder, featured, status
- `packages`: categoryId, name, summary, price, priceUnit, duration, includes, popular, active, sortOrder
- `add_ons`: categoryId, name, price, active
- `providers`: name, business, email, phone, abn, status, payType, payRate, payoutSchedule, availability (jsonb days), rating, bankBsb, bankAccount, notes
- Provider compliance = ABN, insurance and police check verified and not expired (+ licence if a licence row exists). Shown in Assign panel, providers list, dashboard alerts.
- `provider_skills`: (providerId, categoryId)
- `provider_zones`: (providerId, zoneId)
- `provider_documents`: providerId, type, fileUrl, expiresOn, verified
- `bookings`: reference ("HD-xxxxx"), userId, categoryId, packageId, providerId, status, paymentStatus, addressLine, suburbId, accessNotes, serviceDate, timeSlot, subtotal, discount, surcharge, total, providerPay, couponCode, payoutId (set when included in a payout), customerNotes, internalNotes
- `booking_add_ons`: bookingId, addOnId, price (snapshot)
- `booking_events`: bookingId, type (`created` | `assigned` | `status` | `payment` | `note` internal | `message_customer` | `message_team`), message, actorId, createdAt
- `payments`: bookingId, provider (stripe/square/manual), providerRef, amount, status
- `payouts`: providerId, periodStart, periodEnd, amount, jobs, status, paidAt
- `reviews`: bookingId, userId, categoryId, authorName, authorSuburb (display snapshot), rating, body, reply, status, featured
- `coupons`: code, description, type, value, minSpend, usageLimit, usedCount, categoryIds (null = all), restriction ("anyone" | "first_booking" | "once_per_customer", enforced in createBooking), expiresAt, active
- `pages`: slug, title, blocks (jsonb, from ContentEditor), seo, status
- `posts`: slug, title, excerpt, body, blocks (jsonb, ContentEditor format), coverImage, category, status, publishedAt (readTime is computed)
- `banners`: text, link, placement ("Top bar" | "Home hero" | "Service pages"), active, startsAt, endsAt
- `faqs`: question, answer, section ("general" | "payments"), categoryId?, sortOrder
- `enquiries`: name, email, phone, type, bookingRef, subject, message, replies (jsonb [{by,text,at}]), status
- `partner_applications`: name, business, email, phone, abn, experience, skills (slugs), zones (names), message, status
- `activity_log`: actorId?, actorName ("System" or "Rachel (admin)"), message, createdAt
- `site_settings`: key, value (jsonb). Keys in use: `business` (name, phone, email, address, abn, hours, city, region, description…), `booking` (timeSlots[], minNoticeHours, windowDays, freeCancelHours, lateCancelFeePercent, maxJobsPerSlot, sundays, requireDeposit, depositPercent), `images` (hero, kitchen, livingRoom, movingIn, tradie, cleaner), `offers` (seasonal: slugs[])

Commands: `npm run db:push` (dev), `npm run db:generate` + `npm run db:migrate` (migrations), `npm run db:studio`, `npm run db:seed`.
`drizzle.config.js` and `seed.js` load `.env.local` with `@next/env`.
Client: `import { db, schema } from "@/db";` (pg Pool, transactions supported: `db.transaction(async (tx) => …)`). Use Drizzle query builder (`db.select().from(schema.x).where(eq(...))`) or `db.query.x.findMany()`.

**If you change the schema:** update `schema.js`, tell the user to run `db:push` / migrations, and update the matching shape notes in section 6/7 of this file.

---

## 8. How to build common features (recipes)

### 8.1 Connect a page to the database
1. Add query functions in `src/server/queries/<area>.js` (start with `import "server-only";`, wrap in `cache()`).
2. In the page (Server Component), `await` the query and pass plain data to client components as props.
3. Map DB rows to the shapes in section 6 (convert `numeric` strings with `Number()`).
4. Keep `src/lib/data.js` until every page is migrated. Then delete it.

### 8.2 Forms and mutations → Server Actions
- Put actions in `src/server/actions/<area>.js` with `"use server"` at the top.
- Validate input with `zod` (v4: `z.email()`, `{ error: "msg" }`), check the session and role, write to the DB, `revalidatePath(...)`, return `{ ok, error, fieldErrors }`.
- Never trust prices from the browser: use `priceBooking()` in `src/server/pricing.js`.
- In client components, call inside `startTransition` from an `onSubmit` handler (see `useServerForm` in `components/site/forms.jsx`). This avoids React 19 resetting the form fields on error. Every component that needs one already has a `// TODO` comment or a fake `onSubmit` (BookingFlow `confirm`, ContactForm, PartnerForm, BookingActions modals, BookingManager assign/status/payment, ProviderForm, ServiceEditor, CouponsManager, CmsManager, ContentEditor, SettingsView, AddressDialog, profile page).

### 8.3 Auth (two roles) — DONE in batch 2
- Better Auth, `src/server/auth.js`. `users.role` defaults to `customer`; `role`, `blocked`, `teamRole` can't be set from sign-up (`input: false`).
- After login: admin → `/admin`, customer → `/account` (or a safe relative `?next=`).
- `/admin/*` and `/account/*`: quick cookie check in `src/proxy.js`, real check in layouts (`requireAdmin()` / `requireUser()`) and again in every Server Action (`getCurrentUser()`).
- Blocked users: refused at login (session-create hook) and treated as signed out by `getCurrentUser()`.
- Delete account = anonymise (bookings are kept for tax records), remove addresses, logins and sessions.
- The booking flow allows guest checkout with "create an account" ticked by default. Guests later set a password with "Forgot your password?" (reset creates the password login if missing).

### 8.4 Payments
- Placeholder block in `components/site/booking-flow.jsx`, marked `PAYMENT PLACEHOLDER`.
- Stripe: create a PaymentIntent in a Server Action (amount in cents, `currency: "aud"`, `capture_method: "manual"` to authorise at booking and capture after the job), render `<PaymentElement />`, handle the webhook at `src/app/api/stripe/webhook/route.js` to set `payments` + `bookings.paymentStatus`.
- "Pay after the job" stays as an option (invoice by email).
- Admin: `payments-view.jsx` + `settings-view.jsx` (payments tab) already have the UI.

### 8.5 Notifications
- Email: Resend or Postmark (React Email templates). SMS: Twilio or MessageMedia.
- Triggers: booking confirmation, provider assigned, day-before reminder, completed + review request, cancellation.
- The admin "Send job sheet (SMS)" button texts the provider using the template in Settings › Notifications.

### 8.6 File uploads
- Provider documents, service images, CMS images, problem-report photos. Use UploadThing, Vercel Blob or Cloudinary. Add the host to `next.config.mjs` `images.remotePatterns`.

### 8.7 Adding a new page
- Public: `src/app/(site)/<route>/page.jsx`, start with `PageHero`, wrap sections in `container-x`, end with `CtaBand` if it's a marketing page. Add it to the header `nav` or footer lists if needed.
- Admin: `src/app/admin/<route>/page.jsx`, start with `AdminHeader`, add the link to the `nav` array in `components/admin/shell.jsx`.
- Export `metadata = { title: "..." }`.

### 8.8 Adding a new service category
- With the DB: through Admin › Services › Add service. With mock data: add to `categories`, `packages`, `addOns` and `categoryImages` in `data.js`, and add a lucide icon key in `components/category-icon.jsx` if it's new.

---

## 9. Before you hand back code — checklist

- [ ] Only `.js`/`.jsx`. No TypeScript syntax (no `: string`, `interface`, `as const`, generics).
- [ ] Two roles only, no provider login, customers never see provider contact details.
- [ ] Reused existing components and tokens; no new UI library; no green; no ALL-CAPS labels.
- [ ] `"use client"` only where needed; no functions passed from server to client components.
- [ ] Awaited `params`/`searchParams` (Next 16).
- [ ] Secrets only on the server.
- [ ] Prices in AUD, GST-inclusive, formatted with `money()`/`money2()`. Dates via `formatDate()` (Australia/Hobart).
- [ ] Works at 390px wide; keyboard focus visible; images have `alt` (empty `alt=""` if decorative).
- [ ] Listed every file created/changed, and any new npm packages with the exact `npm install` command.
- [ ] Said whether the user needs to run `db:push`, add env vars, or restart the dev server.
- [ ] Gave the lines to add to the Progress log (section 10).

---

## 10. Progress log (update after every task)

Keep this short: date, what changed, files touched, what's next. Newest first.

| Date | Change | Notes |
| --- | --- | --- |
| 2026-11-04 | **Batch 5: catalogue & money.** Services list (bookable switch) + service editor (packages/extras/FAQs/SEO/image URL; used items deactivated not deleted), service areas (zones/suburbs/travel fees/on-off), promo codes (create/edit/pause, per-service, first-booking/once-per-customer rules shown on Offers), payments (paged by status, reminders, Xero CSV) and provider payouts generated from completed jobs (mark paid/hold/undo). Tabs no longer submit forms. Client components receive slim service data. | Next: batch 6 = CMS (pages, homepage, banners, FAQs, blog) + Settings |
| 2026-11-04 | **Batch 4: admin operations on DB.** Dashboard (live KPIs, weekly revenue, compliance alerts, activity), bookings list (server filters/paging, CSV export), booking manager (assign with pay, status flow with guards, record payment/refund, edit, cancel, notes, team messages, SMS job sheet via sms: link, email invoice), phone bookings, customers (paged, CSV, edit/notes/block/reset), providers (list/add/edit/docs/jobs/payouts), inbox (reply/close/approve → provider), reviews (publish/hide/reply; replies shown publicly). Header search + bell work. | Next: batch 5 = services, areas, coupons, payments/payouts, CMS, settings |
| 2026-11-04 | **Batch 3: real bookings.** Checkout creates bookings (server-priced, coupon use counted atomically, slot capacity locked, sequential HD- refs, guests get a customer record + optional set-password email, saved addresses prefilled). Customers can reschedule/cancel (until the free-change window), review (one per booking, pending) and report a problem (→ Inbox complaint). Card option disabled until a provider is chosen. | Next: batch 4 = admin panel on DB; payments batch after provider chosen |
| 2026-11-04 | **Batch 2: auth + account area.** Better Auth (login, register, forgot/reset, optional Google), proxy.js, admin protection + live sidebar counts, account overview/bookings/detail/addresses/profile on DB, booking messages saved, `user:password` script, pg sslmode warning fixed, account layout phone overflow fixed. | Next: batch 3 = create bookings from checkout + reschedule/cancel/review/report |
| 2026-11-04 | **Batch 1: DB connected + public site dynamic.** pg driver, schema additions, seed (`db:seed`), server queries, coupon/slot Server Actions, contact + partner forms save to DB, `/api/health`. Fixed checkout date shifting across time zones. | Next: batch 2 = auth (customer/admin) + account area |
| 2026-11-03 | UI redesign v2: renamed to **Sorted**, navy + hi-vis orange palette, Instrument Sans, photo-led cards, light admin sidebar | All UI pages complete on mock data |
| 2026-11-03 | UI v1: full customer site + admin panel (53 routes total) built in JS on Next 16 + Tailwind v4 | Drizzle schema written, not connected |

### Status by area

| Area | Status |
| --- | --- |
| Customer UI (all pages) | ✅ Done (mock data) |
| Admin UI (all sections) | ✅ Done (mock data) |
| Database connection + seed | ✅ Done (batch 1) |
| Replace mock data with queries | 🟨 All but Admin › CMS and Admin › Settings (batch 6) |
| Contact + partner forms | ✅ Save to DB (batch 1) |
| Auth (customer/admin) + route protection | ✅ Done (batch 2) |
| Customer account area | ✅ On DB (batch 2) + booking actions (batch 3) |
| Booking creation (Server Action) | ✅ Done (batch 3) |
| Admin mutations (assign, status, CRUD) | 🟨 Operations (batch 4) + catalogue & money (batch 5) done; CMS + Settings in batch 6 |
| Payments (cards) | ⬜ Provider not chosen yet (options compared 4 Nov 2026: Stripe 1.7%+30c, Pin Payments from 1.6%+30c, Airwallex 1.65%+30c, Zeller 1.75%+25c, Square online 2.2%). "Pay after the job" works now. |
| Email + SMS notifications | ⬜ Not started |
| File uploads | ⬜ Not started |
| Deploy (Vercel + Neon, Sydney region) | ⬜ Not started |

**Suggested order:** DB connect + seed → read-only queries for public pages → auth → booking Server Action → admin mutations → notifications → payments → uploads → deploy.

---

## 11. Known placeholders and decisions

- Business name, phone, ABN, address and email are placeholders in `src/lib/site.js`.
- Reviews in `data.js` are **sample text**. Replace with real reviews before launch (Australian Consumer Law prohibits fake testimonials).
- Terms and Privacy are template text and need a lawyer's review.
- Photos are Unsplash images (free licence). Replace them with your own when you can.
- Booking reference format: `HD-#####` (can be changed to `SR-#####` when the DB is connected; keep it consistent).
- Slot availability is real: a window is full when non-cancelled bookings on that date reach `booking.maxJobsPerSlot`.
- Sundays, minimum notice and booking window come from `site_settings.booking`.
- Ratings shown on the site are computed from published reviews (no hard-coded "4.8 from 4,800+ jobs").
- Marketing copy (hero headline, how-it-works steps, about/guarantee/terms text) is still in the page files; it moves to the CMS (`pages.blocks`) in the CMS batch.
- Booking rules: online reschedule/cancel allowed until `booking.freeCancelHours` before the window starts; after that the customer is told to call. Rescheduling an assigned booking releases the pro (status back to `new`).
- Guest checkout with an email that already has an account attaches the booking to that account (the owner sees it after logging in). Blocked emails and admin emails are refused.
- Reviews from customers start as `pending` (Admin › Reviews publishes them).

---

## 12. Prompt template for a new chat

Copy, fill in, and paste below this file:

```
I'm continuing work on my project. The full context is in AI_CONTEXT.md above — follow its golden rules (section 1)
and checklist (section 9).

Task: <describe the feature or fix, e.g. "Connect Neon and make /services and /services/[slug] read from the database">

Current state: <anything changed since the progress log, or "as per progress log">

Files you may need (I'll paste them when you ask): <optional list>

Before writing code: list the files you'll create/change, any packages to install, and ask me for the current
contents of files you need to edit.
```