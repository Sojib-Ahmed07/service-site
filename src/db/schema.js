/**
 * Drizzle schema for Neon Postgres — a starting point that matches the UI.
 * Two roles only: "customer" and "admin". Providers (your contractors/employees)
 * are records the admin manages; they never log in.
 *
 * Run:  npm run db:generate  →  npm run db:migrate
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
/* Enums ------------------------------------------------------------------- */
export const roleEnum = pgEnum("role", ["customer", "admin"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "new",
  "assigned",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", ["unpaid", "partial", "paid", "refunded"]);
export const providerStatusEnum = pgEnum("provider_status", ["onboarding", "active", "paused", "inactive"]);
export const payTypeEnum = pgEnum("pay_type", ["per_job", "hourly", "commission"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "paid", "held"]);
export const publishStatusEnum = pgEnum("publish_status", ["draft", "published", "archived"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "published", "hidden"]);
export const couponTypeEnum = pgEnum("coupon_type", ["percent", "fixed"]);
export const enquiryStatusEnum = pgEnum("enquiry_status", ["open", "replied", "closed"]);
export const applicationStatusEnum = pgEnum("application_status", ["new", "reviewing", "approved", "rejected"]);
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};
/* Users & addresses --------------------------------------------------------- */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // works with Better Auth / Auth.js ids
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    phone: varchar("phone", { length: 32 }),
    image: text("image"),
    role: roleEnum("role").default("customer").notNull(),
    blocked: boolean("blocked").default(false).notNull(),
    marketingOptIn: boolean("marketing_opt_in").default(false).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  label: varchar("label", { length: 40 }).default("Home"),
  line1: varchar("line1", { length: 200 }).notNull(),
  line2: varchar("line2", { length: 200 }),
  suburbId: integer("suburb_id")
    .references(() => suburbs.id)
    .notNull(),
  accessNotes: text("access_notes"),
  isDefault: boolean("is_default").default(false).notNull(),
  ...timestamps,
});
/* Service areas ------------------------------------------------------------- */
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  active: boolean("active").default(true).notNull(),
});
export const suburbs = pgTable("suburbs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  postcode: varchar("postcode", { length: 4 }).notNull(),
  zoneId: integer("zone_id")
    .references(() => zones.id)
    .notNull(),
  surcharge: numeric("surcharge", { precision: 10, scale: 2 }).default("0").notNull(),
  active: boolean("active").default(true).notNull(),
});
/* Catalogue ----------------------------------------------------------------- */
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    group: varchar("group", { length: 60 }).notNull(),
    icon: varchar("icon", { length: 40 }).notNull(),
    short: varchar("short", { length: 200 }),
    description: text("description"),
    includes: jsonb("includes").$type().default([]),
    faqs: jsonb("faqs").$type().default([]),
    heroImage: text("hero_image"),
    seoTitle: varchar("seo_title", { length: 160 }),
    seoDescription: varchar("seo_description", { length: 300 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    featured: boolean("featured").default(false).notNull(),
    status: publishStatusEnum("status").default("published").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug)],
);
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .references(() => categories.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  summary: varchar("summary", { length: 240 }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(), // GST inclusive
  priceUnit: varchar("price_unit", { length: 20 }), // e.g. "/hr"
  duration: varchar("duration", { length: 40 }),
  includes: jsonb("includes").$type().default([]),
  popular: boolean("popular").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  ...timestamps,
});
export const addOns = pgTable("add_ons", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .references(() => categories.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").default(true).notNull(),
});
/* Providers (your contractors / employees — no login) ---------------------- */
export const providers = pgTable(
  "providers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    business: varchar("business", { length: 160 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }).notNull(),
    abn: varchar("abn", { length: 20 }),
    status: providerStatusEnum("status").default("onboarding").notNull(),
    payType: payTypeEnum("pay_type").default("per_job").notNull(),
    payRate: varchar("pay_rate", { length: 80 }), // e.g. "70%" or "$68/hr"
    availability: jsonb("availability").$type().default([]), // ["Mon","Tue"]
    rating: numeric("rating", { precision: 2, scale: 1 }).default("0"),
    bankBsb: varchar("bank_bsb", { length: 10 }),
    bankAccount: varchar("bank_account", { length: 20 }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("providers_status_idx").on(t.status)],
);
export const providerSkills = pgTable(
  "provider_skills",
  {
    providerId: integer("provider_id")
      .references(() => providers.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: integer("category_id")
      .references(() => categories.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.categoryId] })],
);
export const providerZones = pgTable(
  "provider_zones",
  {
    providerId: integer("provider_id")
      .references(() => providers.id, { onDelete: "cascade" })
      .notNull(),
    zoneId: integer("zone_id")
      .references(() => zones.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.zoneId] })],
);
export const providerDocuments = pgTable("provider_documents", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id")
    .references(() => providers.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 40 }).notNull(), // insurance | police_check | licence | abn
  fileUrl: text("file_url"),
  expiresOn: date("expires_on"),
  verified: boolean("verified").default(false).notNull(),
  ...timestamps,
});
/* Bookings ------------------------------------------------------------------ */
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    reference: varchar("reference", { length: 16 }).notNull(), // HD-24817
    userId: text("user_id")
      .references(() => users.id)
      .notNull(),
    categoryId: integer("category_id")
      .references(() => categories.id)
      .notNull(),
    packageId: integer("package_id")
      .references(() => packages.id)
      .notNull(),
    providerId: integer("provider_id").references(() => providers.id),
    status: bookingStatusEnum("status").default("new").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("unpaid").notNull(),
    // address snapshot (so edits to saved addresses don't change history)
    addressLine: varchar("address_line", { length: 255 }).notNull(),
    suburbId: integer("suburb_id")
      .references(() => suburbs.id)
      .notNull(),
    accessNotes: text("access_notes"),
    serviceDate: date("service_date").notNull(),
    timeSlot: varchar("time_slot", { length: 40 }).notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 10, scale: 2 }).default("0").notNull(),
    surcharge: numeric("surcharge", { precision: 10, scale: 2 }).default("0").notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    providerPay: numeric("provider_pay", { precision: 10, scale: 2 }),
    couponCode: varchar("coupon_code", { length: 40 }),
    customerNotes: text("customer_notes"),
    internalNotes: text("internal_notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bookings_ref_idx").on(t.reference),
    index("bookings_status_idx").on(t.status),
    index("bookings_date_idx").on(t.serviceDate),
  ],
);
export const bookingAddOns = pgTable(
  "booking_add_ons",
  {
    bookingId: integer("booking_id")
      .references(() => bookings.id, { onDelete: "cascade" })
      .notNull(),
    addOnId: integer("add_on_id")
      .references(() => addOns.id)
      .notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.addOnId] })],
);
/** Timeline: created, assigned, provider contacted, completed, refunds, notes… */
export const bookingEvents = pgTable("booking_events", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  message: text("message").notNull(),
  actorId: text("actor_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  provider: varchar("provider", { length: 30 }).notNull(), // stripe | square | manual
  providerRef: varchar("provider_ref", { length: 120 }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id")
    .references(() => providers.id)
    .notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  jobs: integer("jobs").default(0).notNull(),
  status: payoutStatusEnum("status").default("pending").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});
/* Marketing & CMS ------------------------------------------------------------ */
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id),
  userId: text("user_id").references(() => users.id),
  categoryId: integer("category_id").references(() => categories.id),
  rating: integer("rating").notNull(),
  body: text("body"),
  status: reviewStatusEnum("status").default("pending").notNull(),
  featured: boolean("featured").default(false).notNull(),
  ...timestamps,
});
export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    description: varchar("description", { length: 200 }),
    type: couponTypeEnum("type").notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    minSpend: numeric("min_spend", { precision: 10, scale: 2 }).default("0"),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").default(0).notNull(),
    categoryIds: jsonb("category_ids").$type(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").default(true).notNull(),
  },
  (t) => [uniqueIndex("coupons_code_idx").on(t.code)],
);
export const pages = pgTable(
  "pages",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    blocks: jsonb("blocks").$type().default([]),
    seoTitle: varchar("seo_title", { length: 160 }),
    seoDescription: varchar("seo_description", { length: 300 }),
    status: publishStatusEnum("status").default("draft").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("pages_slug_idx").on(t.slug)],
);
export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    excerpt: varchar("excerpt", { length: 300 }),
    body: text("body"),
    coverImage: text("cover_image"),
    category: varchar("category", { length: 60 }),
    status: publishStatusEnum("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("posts_slug_idx").on(t.slug)],
);
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  text: varchar("text", { length: 200 }).notNull(),
  link: varchar("link", { length: 255 }),
  placement: varchar("placement", { length: 40 }).notNull(),
  active: boolean("active").default(true).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
});
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: varchar("question", { length: 255 }).notNull(),
  answer: text("answer").notNull(),
  categoryId: integer("category_id").references(() => categories.id), // null = general FAQ
  sortOrder: integer("sort_order").default(0).notNull(),
});
export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  type: varchar("type", { length: 40 }).default("General"),
  subject: varchar("subject", { length: 200 }),
  message: text("message").notNull(),
  status: enquiryStatusEnum("status").default("open").notNull(),
  ...timestamps,
});
export const partnerApplications = pgTable("partner_applications", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  business: varchar("business", { length: 160 }),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  abn: varchar("abn", { length: 20 }),
  skills: jsonb("skills").$type().default([]),
  zones: jsonb("zones").$type().default([]),
  message: text("message"),
  status: applicationStatusEnum("status").default("new").notNull(),
  ...timestamps,
});
/** Key/value store for everything on the admin Settings page. */
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
