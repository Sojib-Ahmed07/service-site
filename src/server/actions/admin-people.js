// src/server/actions/admin-people.js
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
    activityLog,
    categories,
    enquiries,
    partnerApplications,
    providerDocuments,
    providerSkills,
    providerZones,
    providers,
    reviews,
    sessions,
    users,
    zones,
} from "@/db/schema";
import { weekdays } from "@/lib/constants";
import { isISODate } from "@/lib/dates";
import { auth } from "@/server/auth";
import { sendEmail } from "@/server/email";
import { logError } from "@/server/errors";
import { getBusiness } from "@/server/queries/settings";
import { getAdmin } from "@/server/session";

const denied = { ok: false, error: "Only admins can do that. Please log in again." };
const failed = (tag, err, msg = "Something went wrong. Please try again.") => {
    logError(tag, err);
    return { ok: false, error: msg };
};
const who = (admin) => `${admin.name.split(" ")[0]} (admin)`;
const activity = (admin, message) => db.insert(activityLog).values({ actorId: admin.id, actorName: who(admin), message });
function fieldErrors(error) {
    const out = {};
    for (const i of error.issues) if (i.path[0] && !out[i.path[0]]) out[i.path[0]] = i.message;
    return out;
}
const phoneRule = (required) =>
    z
        .string()
        .trim()
        .max(32)
        .refine((v) => (!required && v === "") || v.replace(/\D/g, "").length >= 8, { error: "Enter a valid phone number." });

/* Customers ------------------------------------------------------------------ */

const customerSchema = z.object({
    name: z.string().trim().min(2, { error: "Enter a name." }).max(120),
    email: z.email({ error: "Enter a valid email address." }).max(255),
    phone: phoneRule(false),
    adminNotes: z.string().trim().max(5000),
});

export async function updateCustomer(id, formData) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = customerSchema.safeParse({
        name: formData.get("name") ?? "",
        email: String(formData.get("email") ?? "")
            .trim()
            .toLowerCase(),
        phone: formData.get("phone") ?? "",
        adminNotes: formData.get("adminNotes") ?? "",
    });
    if (!parsed.success)
        return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    const v = parsed.data;
    try {
        const [taken] = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(sql`lower(${users.email})`, v.email), ne(users.id, String(id))))
            .limit(1);
        if (taken) return { ok: false, fieldErrors: { email: "Another account already uses this email." } };
        const done = await db
            .update(users)
            .set({ name: v.name, email: v.email, phone: v.phone || null, adminNotes: v.adminNotes || null, updatedAt: new Date() })
            .where(and(eq(users.id, String(id)), eq(users.role, "customer")))
            .returning({ id: users.id });
        if (!done.length) return { ok: false, error: "Customer not found." };
        await activity(admin, `Updated customer ${v.name}`);
        revalidatePath("/admin", "layout");
        return { ok: true, message: "Customer saved" };
    } catch (err) {
        return failed("updateCustomer", err);
    }
}

/** Blocking stops them logging in or booking online and signs them out everywhere. */
export async function setCustomerBlocked(id, blocked) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const [u] = await db
            .update(users)
            .set({ blocked: Boolean(blocked), updatedAt: new Date() })
            .where(and(eq(users.id, String(id)), eq(users.role, "customer")))
            .returning({ name: users.name });
        if (!u) return { ok: false, error: "Customer not found." };
        if (blocked) await db.delete(sessions).where(eq(sessions.userId, String(id)));
        await activity(admin, `${blocked ? "Blocked" : "Unblocked"} customer ${u.name}`);
        revalidatePath("/admin", "layout");
        return { ok: true, message: blocked ? "Customer blocked" : "Customer unblocked" };
    } catch (err) {
        return failed("setCustomerBlocked", err);
    }
}

export async function sendCustomerPasswordReset(id) {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const [u] = await db
            .select({ email: users.email, blocked: users.blocked })
            .from(users)
            .where(and(eq(users.id, String(id)), eq(users.role, "customer")))
            .limit(1);
        if (!u) return { ok: false, error: "Customer not found." };
        if (u.blocked) return { ok: false, error: "Unblock the customer first." };
        await auth.api.requestPasswordReset({ body: { email: u.email, redirectTo: "/reset-password" }, headers: await headers() });
        return { ok: true, message: `Reset link sent to ${u.email}` };
    } catch (err) {
        return failed("sendCustomerPasswordReset", err);
    }
}

/* Providers ------------------------------------------------------------------ */

const docTypes = ["abn", "insurance", "police_check", "licence"];
const providerSchema = z.object({
    id: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(2, { error: "Enter their name." }).max(120),
    business: z.string().trim().max(160),
    phone: phoneRule(true),
    email: z.union([z.literal(""), z.email({ error: "Enter a valid email address." }).max(255)]),
    abn: z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d{11}$/.test(v.replace(/\s/g, "")), { error: "An ABN has 11 digits." }),
    status: z.enum(["onboarding", "active", "paused", "inactive"]),
    payType: z.enum(["per_job", "hourly", "commission"]),
    payRate: z.string().trim().max(80),
    payoutSchedule: z.enum(["Weekly (Friday)", "Fortnightly", "Per job"]),
    bankBsb: z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d{3}-?\d{3}$/.test(v), { error: "A BSB looks like 062-000." }),
    bankAccount: z
        .string()
        .trim()
        .refine((v) => v === "" || /^\d{4,10}$/.test(v.replace(/\s/g, "")), { error: "Enter 4–10 digits." }),
    rating: z.coerce.number().min(0).max(5),
    notes: z.string().trim().max(5000),
    skills: z.array(z.string()).max(100),
    zones: z.array(z.string()).max(50),
    availability: z.array(z.enum(weekdays)).max(7),
});

/** Create or update a provider, including services, zones, days and documents. */
export async function saveProvider(formData) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = providerSchema.safeParse({
        id: formData.get("id") || undefined,
        name: formData.get("name") ?? "",
        business: formData.get("business") ?? "",
        phone: formData.get("phone") ?? "",
        email: String(formData.get("email") ?? "")
            .trim()
            .toLowerCase(),
        abn: formData.get("abn") ?? "",
        status: formData.get("status") ?? "onboarding",
        payType: formData.get("payType") ?? "per_job",
        payRate: formData.get("payRate") ?? "",
        payoutSchedule: formData.get("payoutSchedule") ?? "Weekly (Friday)",
        bankBsb: formData.get("bankBsb") ?? "",
        bankAccount: formData.get("bankAccount") ?? "",
        rating: formData.get("rating") || 0,
        notes: formData.get("notes") ?? "",
        skills: formData.getAll("skills").map(String),
        zones: formData.getAll("zones").map(String),
        availability: formData.getAll("availability").map(String),
    });
    if (!parsed.success)
        return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    const v = parsed.data;

    // Documents: doc_<type>_state = "verified" | "missing" | "na", doc_<type>_expires = YYYY-MM-DD
    const docs = [];
    for (const type of docTypes) {
        const state = String(formData.get(`doc_${type}_state`) ?? "missing");
        const expires = String(formData.get(`doc_${type}_expires`) ?? "");
        if (expires && !isISODate(expires)) return { ok: false, fieldErrors: { [`doc_${type}`]: "Enter a valid date." } };
        if (state === "na") continue;
        docs.push({ type, verified: state === "verified", expiresOn: expires || null });
    }
    if (v.status === "active" && !v.skills.length) {
        return { ok: false, fieldErrors: { skills: "Choose at least one service before making them active." } };
    }

    try {
        const [catRows, zoneRows] = await Promise.all([
            v.skills.length ? db.select({ id: categories.id }).from(categories).where(inArray(categories.slug, v.skills)) : [],
            v.zones.length ? db.select({ id: zones.id }).from(zones).where(inArray(zones.name, v.zones)) : [],
        ]);
        const id = await db.transaction(async (tx) => {
            const values = {
                name: v.name,
                business: v.business || null,
                phone: v.phone,
                email: v.email || null,
                abn: v.abn.replace(/\s/g, "") || null,
                status: v.status,
                payType: v.payType,
                payRate: v.payRate || null,
                payoutSchedule: v.payoutSchedule,
                bankBsb: v.bankBsb || null,
                bankAccount: v.bankAccount.replace(/\s/g, "") || null,
                rating: v.rating.toFixed(1),
                notes: v.notes || null,
                availability: v.availability,
                updatedAt: new Date(),
            };
            let pid = v.id;
            if (pid) {
                const done = await tx.update(providers).set(values).where(eq(providers.id, pid)).returning({ id: providers.id });
                if (!done.length) throw new Error("NOT_FOUND");
                await tx.delete(providerSkills).where(eq(providerSkills.providerId, pid));
                await tx.delete(providerZones).where(eq(providerZones.providerId, pid));
                await tx.delete(providerDocuments).where(eq(providerDocuments.providerId, pid));
            } else {
                [{ id: pid }] = await tx.insert(providers).values(values).returning({ id: providers.id });
            }
            if (catRows.length) await tx.insert(providerSkills).values(catRows.map((c) => ({ providerId: pid, categoryId: c.id })));
            if (zoneRows.length) await tx.insert(providerZones).values(zoneRows.map((z) => ({ providerId: pid, zoneId: z.id })));
            if (docs.length) await tx.insert(providerDocuments).values(docs.map((d) => ({ ...d, providerId: pid })));
            await tx
                .insert(activityLog)
                .values({ actorId: admin.id, actorName: who(admin), message: `${v.id ? "Updated" : "Added"} provider ${v.name}` });
            return pid;
        });
        revalidatePath("/admin", "layout");
        return { ok: true, id, message: v.id ? "Provider saved" : "Provider added" };
    } catch (err) {
        if (err.message === "NOT_FOUND") return { ok: false, error: "That provider no longer exists." };
        return failed("saveProvider", err, "We couldn’t save the provider. Please try again.");
    }
}

/* Inbox ------------------------------------------------------------------------ */

export async function replyToEnquiry(id, text) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const body = String(text ?? "").trim();
    if (body.length < 2) return { ok: false, error: "Write a reply first." };
    if (body.length > 5000) return { ok: false, error: "Replies can be up to 5,000 characters." };
    try {
        const [e] = await db
            .select()
            .from(enquiries)
            .where(eq(enquiries.id, Number(id)))
            .limit(1);
        if (!e) return { ok: false, error: "Message not found." };
        const business = await getBusiness();
        await sendEmail({
            to: e.email,
            subject: `Re: ${e.subject || "your message"}`,
            text: `Hi ${e.name.split(" ")[0]},\n\n${body}\n\n${admin.name.split(" ")[0]}\n${business.name} · ${business.phone}`,
        });
        const reply = { by: admin.name, text: body, at: new Date().toISOString() };
        await db
            .update(enquiries)
            .set({ replies: [...(e.replies ?? []), reply], status: "replied", updatedAt: new Date() })
            .where(eq(enquiries.id, e.id));
        await activity(admin, `Replied to ${e.name}`);
        revalidatePath("/admin", "layout");
        return { ok: true, reply };
    } catch (err) {
        return failed("replyToEnquiry", err);
    }
}

export async function setEnquiryStatus(id, status) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (!["open", "replied", "closed"].includes(status)) return { ok: false, error: "Unknown status." };
    try {
        await db
            .update(enquiries)
            .set({ status, updatedAt: new Date() })
            .where(eq(enquiries.id, Number(id)));
        revalidatePath("/admin", "layout");
        return { ok: true };
    } catch (err) {
        return failed("setEnquiryStatus", err);
    }
}

/**
 * Updates a partner application. Approving creates an "onboarding" provider with the
 * applicant's details, services and zones (returns its id), so you can add documents.
 */
export async function setApplicationStatus(id, status) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (!["new", "reviewing", "approved", "rejected"].includes(status)) return { ok: false, error: "Unknown status." };
    try {
        const [a] = await db
            .select()
            .from(partnerApplications)
            .where(eq(partnerApplications.id, Number(id)))
            .limit(1);
        if (!a) return { ok: false, error: "Application not found." };
        if (a.status === "approved" && status === "approved") return { ok: false, error: "Already approved." };
        let providerId = null;
        await db.transaction(async (tx) => {
            await tx.update(partnerApplications).set({ status, updatedAt: new Date() }).where(eq(partnerApplications.id, a.id));
            if (status === "approved") {
                const [catRows, zoneRows] = await Promise.all([
                    a.skills?.length ? tx.select({ id: categories.id }).from(categories).where(inArray(categories.slug, a.skills)) : [],
                    a.zones?.length ? tx.select({ id: zones.id }).from(zones).where(inArray(zones.name, a.zones)) : [],
                ]);
                [{ id: providerId }] = await tx
                    .insert(providers)
                    .values({
                        name: a.name,
                        business: a.business,
                        email: a.email,
                        phone: a.phone,
                        abn: a.abn,
                        status: "onboarding",
                        availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                        notes: `From partner application (${a.experience ?? "experience not given"}).`,
                    })
                    .returning({ id: providers.id });
                if (catRows.length) await tx.insert(providerSkills).values(catRows.map((c) => ({ providerId, categoryId: c.id })));
                if (zoneRows.length) await tx.insert(providerZones).values(zoneRows.map((z) => ({ providerId, zoneId: z.id })));
            }
            await tx.insert(activityLog).values({
                actorId: admin.id,
                actorName: who(admin),
                message: `${status === "approved" ? "Approved" : status === "rejected" ? "Declined" : "Updated"} application from ${a.name}`,
            });
        });
        revalidatePath("/admin", "layout");
        return { ok: true, providerId };
    } catch (err) {
        return failed("setApplicationStatus", err);
    }
}

/* Reviews ---------------------------------------------------------------------- */

export async function setReviewStatus(id, status) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (!["pending", "published", "hidden"].includes(status)) return { ok: false, error: "Unknown status." };
    try {
        const [r] = await db
            .update(reviews)
            .set({ status, updatedAt: new Date() })
            .where(eq(reviews.id, Number(id)))
            .returning({ name: reviews.authorName });
        if (!r) return { ok: false, error: "Review not found." };
        await activity(
            admin,
            `${status === "published" ? "Published" : status === "hidden" ? "Hid" : "Reset"} review from ${r.name ?? "a customer"}`,
        );
        revalidatePath("/", "layout"); // review walls on the public site
        return { ok: true };
    } catch (err) {
        return failed("setReviewStatus", err);
    }
}

export async function saveReviewReply(id, text) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const body = String(text ?? "").trim();
    if (body.length > 1000) return { ok: false, error: "Replies can be up to 1,000 characters." };
    try {
        const done = await db
            .update(reviews)
            .set({ reply: body || null, updatedAt: new Date() })
            .where(eq(reviews.id, Number(id)))
            .returning({ id: reviews.id });
        if (!done.length) return { ok: false, error: "Review not found." };
        revalidatePath("/", "layout");
        return { ok: true };
    } catch (err) {
        return failed("saveReviewReply", err);
    }
}