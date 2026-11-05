// src/lib/cms.js
/**
 * Website content (Admin › Content) shared by the admin editor and the public site.
 * Safe to import from client and server code: no database access here.
 */

/**
 * Pages that have their own layout on the site. They are always live, their URL can't
 * change and they can't be deleted. The admin edits the header text, the content
 * blocks and the SEO fields.
 */
export const builtInPages = [
    { slug: "/services", title: "All services" },
    { slug: "/areas", title: "Areas we cover" },
    { slug: "/offers", title: "Current offers" },
    { slug: "/how-it-works", title: "How Sorted works" },
    { slug: "/guarantee", title: "The Sorted guarantee" },
    { slug: "/about", title: "About us" },
    { slug: "/help", title: "How can we help?" },
    { slug: "/contact", title: "Get in touch" },
    { slug: "/partners", title: "Work with us" },
    { slug: "/blog", title: "Home care guides" },
    { slug: "/terms", title: "Terms of service" },
    { slug: "/privacy", title: "Privacy policy" },
];
export const isBuiltInPage = (slug) => builtInPages.some((p) => p.slug === slug);

/** First URL segments already used by the app. New pages can't take these. */
export const reservedSlugs = [
    "",
    "about",
    "account",
    "admin",
    "api",
    "areas",
    "blog",
    "book",
    "contact",
    "forgot-password",
    "guarantee",
    "help",
    "how-it-works",
    "login",
    "offers",
    "partners",
    "privacy",
    "register",
    "reset-password",
    "services",
    "terms",
    "_next",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
];

/** "Spring Clean Tips!" → "spring-clean-tips" */
export function slugify(text) {
    return String(text ?? "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

/** Block types the editor offers. */
export const blockTypes = ["heading", "text", "image", "quote", "cta", "cards"];

/** Words in {braces} that are swapped for live values from Admin › Settings. */
export const contentVariables = [
    ["business_name", "Business name"],
    ["phone", "Phone"],
    ["email", "Email"],
    ["abn", "ABN"],
    ["city", "City"],
    ["region", "Region"],
    ["hours", "Opening hours"],
    ["free_cancel_hours", "Free changes until (hours)"],
    ["late_fee", "Late change fee (%)"],
    ["guarantee_hours", "Guarantee window (hours)"],
    ["invoice_days", "Invoice due (days)"],
];

/** Builds the values for {variables} from the settings objects. */
export function contentVars({ business = {}, rules = {}, payments = {} }) {
    return {
        business_name: business.name ?? "",
        phone: business.phone ?? "",
        email: business.email ?? "",
        abn: business.abn ?? "",
        city: business.city ?? "",
        region: business.region ?? "",
        hours: business.hours ?? "",
        free_cancel_hours: String(rules.freeCancelHours ?? ""),
        late_fee: String(rules.lateCancelFeePercent ?? ""),
        guarantee_hours: String(rules.guaranteeHours ?? ""),
        invoice_days: String(payments.invoiceDays ?? ""),
    };
}

/** Replaces {known_variables}; unknown words in braces are left as they are. */
export function fillVars(text, vars) {
    if (!text || !vars) return text ?? "";
    return String(text).replace(/\{([a-z_]+)\}/g, (all, key) => (key in vars ? vars[key] : all));
}

/** Homepage sections the admin can reorder or hide (the hero and closing banner always show). */
export const homeSections = [
    { id: "browse", label: "Browse services" },
    { id: "popular", label: "Most booked" },
    { id: "how", label: "How it works" },
    { id: "team", label: "One team" },
    { id: "reviews", label: "Reviews" },
    { id: "areas", label: "Areas we cover" },
    { id: "faq", label: "Questions" },
];

/** Where a banner can appear. */
export const bannerPlacements = ["Top bar", "Home hero", "Service pages"];

/** Unsplash photo id ("photo-123…") or a full https:// URL. */
export const isImageRef = (v) => v === "" || /^photo-[\w-]+$/.test(v) || /^https:\/\/\S+$/.test(v);