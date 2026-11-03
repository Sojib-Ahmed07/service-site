# Sorted — Home services, sorted.

The UI for a home-services booking business (like Sheba.xyz, Jim's Group or Urban Company), where **you are the middleman**:

- **Customers** browse services, pick a fixed-price package, choose a time and book. They only ever talk to you.
- **Admin** (you) sees every booking, filters your provider list by service, zone and working day, calls or texts the right person, and assigns the job.
- **Providers** (your cleaners, pest technicians, tradies) are records the admin manages. They have **no login** and never interact with customers through the site.

100% JavaScript (`.js` / `.jsx`) — no TypeScript files or config.

Stack: **Next.js 16 (App Router) + JavaScript, Tailwind CSS v4, lucide-react icons, Drizzle ORM + Neon Postgres** (schema included, not wired yet).

> The name "Sorted", phone number, ABN and address are placeholders. Change them in `src/lib/site.js` and the whole site updates. The business operates in Greater Hobart, Tasmania.

---

## 1. Run it locally

You need **Node.js 20.9 or newer** (`node -v` to check).

```bash
# 1. unzip, then open the folder
cd sorted

# 2. install packages
npm install

# 3. create your env file
cp .env.example .env.local      # Windows: copy .env.example .env.local

# 4. start the dev server
npm run dev
```

Open http://localhost:3000.

- Customer site: http://localhost:3000
- Admin panel: http://localhost:3000/admin
- On the login page, any email containing **"admin"** opens the admin panel (demo only).

All data currently comes from **`src/lib/data.js`** (mock data), so every page works without a database.

Production build check: `npm run build` then `npm start`.

---

## 2. What's included

### Customer site
| Page | Route |
| --- | --- |
| Home (search, services, how it works, comparison, reviews, areas, FAQ) | `/` |
| All services with group filter + search | `/services` |
| Service page with package picker, extras, sticky price summary | `/services/[slug]` |
| 4-step booking: address, date & time, details, payment + promo code | `/book/[slug]` |
| Booking confirmed | `/book/success` |
| How it works, Our guarantee, About | `/how-it-works`, `/guarantee`, `/about` |
| Areas we cover (live suburb checker + travel fees) | `/areas` |
| Offers / promo codes | `/offers` |
| Help centre, Contact (quote/complaint form) | `/help`, `/contact` |
| Blog ("Home care guides") | `/blog`, `/blog/[slug]` |
| Work with us (provider application form → admin inbox) | `/partners` |
| Terms, Privacy (template text — get it reviewed) | `/terms`, `/privacy` |
| Log in, Sign up, Forgot password | `/login`, `/register`, `/forgot-password` |
| My account: overview, bookings, booking detail (progress, reschedule, cancel, review, report a problem, messages with you), addresses, profile | `/account/...` |

### Admin panel (`/admin`)
| Section | What you can do |
| --- | --- |
| **Dashboard** | Jobs needing a provider, today's schedule, weekly revenue chart, top services, provider compliance alerts, activity log |
| **Bookings** | Filter by status / service / zone, search, sort. Create bookings for phone customers (`/admin/bookings/new`) |
| **Booking detail** | **Find a provider** panel: lists everyone with the right skill, filtered by zone, working day and status, with call / SMS / email buttons and one-click Assign. Set provider pay, see your margin, change status, record payments/refunds, edit/cancel, internal notes, timeline, customer messages |
| **Providers** | Your workforce. Filter by service, zone, working day, status. Profile with skills, zones, days, pay rate, bank details, documents (ABN, insurance, police check, licence) with expiry, job history and payouts |
| **Customers** | Search, sort by spend, booking history, block/unblock, book on their behalf |
| **Inbox** | Contact/quote messages with reply, and provider applications (approve/decline) |
| **Services & pricing** | Edit every service: details, packages & prices, default provider pay, extras, FAQs, SEO, featured/bookable toggles. Add new services |
| **Service areas** | Zones and suburbs, travel fee per suburb, switch areas on/off |
| **Promo codes** | Create % or $ codes with min spend, limits, expiry, scope |
| **Payments & payouts** | Customer payments, outstanding invoices, GST collected, weekly provider payouts, gateway status |
| **Content (CMS)** | Pages (block editor), homepage text + section order, banners, FAQs, blog posts |
| **Reviews** | Publish / hide / reply |
| **Settings** | Business details, booking rules (notice, cancellation, slots, Sundays, deposits), notification + SMS job-sheet templates, payment gateway setup (Stripe / Square / Tyro / PayPal), admin team |

---

## 3. Folder map

```
src/
  app/
    (site)/          customer pages (share header + footer)
      account/       logged-in customer area
    (auth)/          login / register / forgot password (split-screen layout)
    admin/           admin panel (own sidebar layout)
    layout.jsx       fonts + global metadata
    globals.css      design tokens (colours, fonts, radius) — Tailwind v4 @theme
    not-found.jsx
  components/
    ui/              Button, Input/Select/Field, Card, Badge, Table, Modal, Tabs, Switch, Accordion, toast
    site/            header, footer, hero search, package picker, booking flow, account pieces, forms
    admin/           shell (sidebar), tables, booking manager (assignment), editors, settings
  lib/
    data.js          MOCK DATA — shaped like the database tables
    site.js          business name, phone, email, address
    utils.js         cn(), money formatting (AUD), dates (Australia/Hobart)
  db/
    schema.js        Drizzle schema for Neon (all tables the UI needs)
    index.js         Drizzle + Neon client
```

**Design system:** colours and fonts live in `src/app/globals.css` under `@theme`. Workwear navy (`ink-*`) for text and primary actions, hi-vis safety orange (`brand-*`) only for the main call to action, on white and cool grey. One typeface, Instrument Sans (bundled via npm, no Google Fonts call). Service photos come from Unsplash ids in `src/lib/data.js` (`categoryImages`, `images`) and fall back to a neutral block if one fails — replace them with your own photos when you can.

---

## 4. Next steps (in this order)

### Step 1 — Database (Neon + Drizzle)
1. Create a project at neon.tech, region **AWS Asia Pacific (Sydney)**.
2. Copy the **pooled** connection string into `.env.local` as `DATABASE_URL`.
3. Create the tables:
   ```bash
   npm run db:push        # quick, for development
   # or: npm run db:generate && npm run db:migrate
   npm run db:studio      # browse the data
   ```
4. Write a small seed script that inserts the arrays from `src/lib/data.js`.
5. Replace mock imports page by page. Example in a server page:
   ```js
   import { db, schema } from "@/db";
   const categories = await db.select().from(schema.categories);
   ```
   For forms (booking, contact, assign provider), use **Server Actions** — each component has a `// TODO` where the action goes.

### Step 2 — Auth (two roles: customer, admin)
Use **Better Auth** or **Auth.js**. The `users` table already has a `role` column (`customer` | `admin`).
- After login, send admins to `/admin` and customers to `/account`.
- Protect `/admin` and `/account` in `src/proxy.js` (Next 16's name for middleware) or at the top of `src/app/admin/layout.jsx`.

### Step 3 — Payments
The checkout has a clearly marked placeholder block in `src/components/site/booking-flow.jsx`. For Australia, **Stripe** is the simplest (cards, Apple Pay, Google Pay; authorise at booking, capture after the job). Square and Tyro are good alternatives. "Pay after the job" already works as an option.

### Step 4 — Notifications
- Email: Resend or Postmark.
- SMS (job sheets to providers, reminders to customers): Twilio or MessageMedia (Australian).

### Step 5 — Images
Add service photos through the admin. Upload with UploadThing, Cloudinary or Vercel Blob and add the host to `next.config.mjs` → `images.remotePatterns`.

### Deploy
Push to GitHub → import into **Vercel** → add the env vars → deploy. Neon + Vercel work together out of the box.

---

## 5. Before launch
- Replace placeholder business details (`src/lib/site.js`), prices and copy.
- Replace the sample reviews in `data.js` with real ones (Australian Consumer Law prohibits fake testimonials).
- Have the Terms and Privacy pages reviewed by a lawyer.
- Check your GST registration and that prices are shown GST-inclusive.
