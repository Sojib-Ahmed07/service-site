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
| Database | **Neon Postgres + Drizzle ORM** (schema written in `src/db/schema.js`, **not connected yet**) |
| Data today | All pages read **mock data** from `src/lib/data.js` |
| Auth | **Not built yet** (UI only). Planned: Better Auth or Auth.js |
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
cp .env.example .env.local    # Windows: copy .env.example .env.local
npm run dev                   # http://localhost:3000
npm run build                 # production build check
npm run format                # Prettier (printWidth 130)
```

- Customer site: `/` • Admin panel: `/admin`
- Demo login: on `/login`, any email containing `admin` routes to `/admin`; otherwise `/account`. (Fake, to be replaced by real auth.)

Env vars (`.env.example`): `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `AUTH_SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

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
                            ServiceTile, TrustStrip, HowItWorks, ReviewWall, CtaBand, PageHero, MoreLink),
                            service-browser, package-picker, booking-flow, booking-row, booking-actions (+ MessageThread),
                            account-nav, address-dialog, auth-forms, forms (ContactForm, PartnerForm), legal, suburb-checker
    admin/                  shell (AdminShell), ui (AdminHeader, StatCard, BarChart, ContactButtons, FilterTabs,
                            FilterSelect, SearchInput), bookings-table, booking-manager (+ AssignPanel), new-booking-form,
                            providers-table, provider-form, customers-table, service-editor, coupons-manager,
                            payments-view, reviews-manager, cms-manager, content-editor, inbox, settings-view

  lib/
    site.js                 Brand + business details (name, phone, email, address, ABN, hours, region). Change name here.
    data.js                 MOCK DATA + lookup helpers + status metadata (see section 6)
    utils.js                cn(), money(), money2(), formatDate(), initials(), gstComponent()
  db/
    schema.js               Drizzle schema (see section 7)
    index.js                export const db = drizzle(neon(DATABASE_URL), { schema }); export { schema }
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

## 6. Mock data (`src/lib/data.js`) — shapes the UI depends on

When replacing with DB queries, **return objects in these same shapes** (or adapt the component), so the UI keeps working.

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

Not connected yet. The tables match the UI. Enums:

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

- `users`: id (text, auth-library compatible), name, email (unique), emailVerified, phone, image, **role**, blocked, marketingOptIn, timestamps
- `addresses`: userId → users, label, line1, line2, suburbId → suburbs, accessNotes, isDefault
- `zones`: name, active
- `suburbs`: name, postcode, zoneId → zones, surcharge, active
- `categories`: slug, name, group, icon, short, description, includes (jsonb), faqs (jsonb), heroImage, seoTitle, seoDescription, sortOrder, featured, status
- `packages`: categoryId, name, summary, price, priceUnit, duration, includes, popular, active, sortOrder
- `add_ons`: categoryId, name, price, active
- `providers`: name, business, email, phone, abn, status, payType, payRate, availability (jsonb days), rating, bankBsb, bankAccount, notes
- `provider_skills`: (providerId, categoryId)
- `provider_zones`: (providerId, zoneId)
- `provider_documents`: providerId, type, fileUrl, expiresOn, verified
- `bookings`: reference ("HD-xxxxx"), userId, categoryId, packageId, providerId, status, paymentStatus, addressLine, suburbId, accessNotes, serviceDate, timeSlot, subtotal, discount, surcharge, total, providerPay, couponCode, customerNotes, internalNotes
- `booking_add_ons`: bookingId, addOnId, price (snapshot)
- `booking_events`: bookingId, type, message, actorId, createdAt (timeline + customer messages + internal notes)
- `payments`: bookingId, provider (stripe/square/manual), providerRef, amount, status
- `payouts`: providerId, periodStart, periodEnd, amount, jobs, status, paidAt
- `reviews`: bookingId, userId, categoryId, rating, body, status, featured
- `coupons`: code, description, type, value, minSpend, usageLimit, usedCount, categoryIds, expiresAt, active
- `pages`: slug, title, blocks (jsonb, from ContentEditor), seo, status
- `posts`: slug, title, excerpt, body, coverImage, category, status, publishedAt
- `banners`: text, link, placement ("Top bar" | "Home hero" | "Service pages"), active, startsAt, endsAt
- `faqs`: question, answer, categoryId?, sortOrder
- `enquiries`: name, email, phone, type, subject, message, status
- `partner_applications`: name, business, email, phone, abn, skills, zones, message, status
- `site_settings`: key, value (jsonb) — business info, booking rules, notification templates, gateway config

Commands: `npm run db:push` (dev), `npm run db:generate` + `npm run db:migrate` (migrations), `npm run db:studio`.
Client: `import { db, schema } from "@/db";` (neon-http driver). Use Drizzle query builder (`db.select().from(schema.x).where(eq(...))`) or `db.query.x.findMany()`.

**If you change the schema:** update `schema.js`, tell the user to run `db:push` / migrations, and update the matching shape notes in section 6/7 of this file.

---

## 8. How to build common features (recipes)

### 8.1 Connect a page to the database
1. Create query functions in `src/server/queries/<area>.js` (server-only), e.g. `getCategories()`, `getBookingById(ref)`. Add `import "server-only";` at the top (install the `server-only` package).
2. In the page (Server Component), `await` the query and pass plain data to client components as props.
3. Map DB rows to the shapes in section 6, or update the component props.
4. Keep `src/lib/data.js` until every page is migrated. Then delete unused mock exports.
5. Write `src/db/seed.js` (run with `node --env-file=.env.local src/db/seed.js`) that inserts the mock arrays.

### 8.2 Forms and mutations → Server Actions
- Put actions in `src/server/actions/<area>.js` with `"use server"` at the top.
- Validate input (install `zod` if needed), check the session and role, write to the DB, `revalidatePath(...)`, return `{ ok, error }`.
- In client components, call with `useActionState` or `startTransition`. Every component that needs one already has a `// TODO` comment or a fake `onSubmit` (BookingFlow `confirm`, ContactForm, PartnerForm, BookingActions modals, BookingManager assign/status/payment, ProviderForm, ServiceEditor, CouponsManager, CmsManager, ContentEditor, SettingsView, AddressDialog, profile page).

### 8.3 Auth (two roles)
- Recommended: **Better Auth** (Drizzle adapter, email+password + Google). Auth.js is fine too.
- `users.role` defaults to `customer`. Admins are set manually (DB or an admin "Team" invite in Settings).
- After login: role `admin` → `/admin`, else → `/account` (replace the demo logic in `components/site/auth-forms.jsx`).
- Protect `/admin/*` (admin only) and `/account/*` (logged in) in `src/proxy.js` **and** re-check inside Server Actions.
- Replace `demoUser` with the session user in `app/(site)/account/*` and the header ("Log in" → account menu when signed in).
- The booking flow allows guest checkout with "create an account" ticked by default. Keep that.

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
| 2026-11-03 | UI redesign v2: renamed to **Sorted**, navy + hi-vis orange palette, Instrument Sans, photo-led cards, light admin sidebar | All UI pages complete on mock data |
| 2026-11-03 | UI v1: full customer site + admin panel (53 routes total) built in JS on Next 16 + Tailwind v4 | Drizzle schema written, not connected |

### Status by area

| Area | Status |
| --- | --- |
| Customer UI (all pages) | ✅ Done (mock data) |
| Admin UI (all sections) | ✅ Done (mock data) |
| Database connection + seed | ⬜ Not started |
| Replace mock data with queries | ⬜ Not started |
| Auth (customer/admin) + route protection | ⬜ Not started |
| Booking creation (Server Action) | ⬜ Not started |
| Admin mutations (assign, status, CRUD) | ⬜ Not started |
| Payments (Stripe/Square/Tyro) | ⬜ Not decided |
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
- "Fully booked" on the 4th time slot in `BookingFlow` is a visual example only; real availability should come from booking counts vs the "max jobs per window" setting.
- Sundays are disabled in the date picker (setting exists in Admin › Settings › Booking rules).

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