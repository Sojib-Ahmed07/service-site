// src/server/actions/enquiries.js
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { activityLog, enquiries, partnerApplications } from "@/db/schema";
import { enquiryTypes, experienceOptions } from "@/lib/constants";
import { getSkillAndZoneOptions } from "@/server/queries/catalog";

const phone = z
    .string()
    .trim()
    .max(32)
    .refine((v) => v === "" || v.replace(/\D/g, "").length >= 8, { error: "Enter a valid phone number." });

const enquirySchema = z.object({
    name: z.string().trim().min(2, { error: "Enter your name." }).max(120),
    email: z.email({ error: "Enter a valid email address." }).max(255),
    phone: phone.optional().default(""),
    type: z.enum(enquiryTypes).catch("General"),
    bookingRef: z
        .string()
        .trim()
        .toUpperCase()
        .max(16)
        .refine((v) => v === "" || /^[A-Z]{2}-\d{4,6}$/.test(v), { error: "References look like HD-24817." })
        .optional()
        .default(""),
    message: z.string().trim().min(10, { error: "Tell us a little more (at least 10 characters)." }).max(5000),
});

const applicationSchema = z.object({
    name: z.string().trim().min(2, { error: "Enter your name." }).max(120),
    business: z.string().trim().min(2, { error: "Enter your business name." }).max(160),
    phone: phone.refine((v) => v !== "", { error: "Enter your mobile number." }),
    email: z.email({ error: "Enter a valid email address." }).max(255),
    abn: z
        .string()
        .trim()
        .refine((v) => v.replace(/\s/g, "").length === 11 && /^\d+$/.test(v.replace(/\s/g, "")), {
            error: "An ABN has 11 digits.",
        }),
    experience: z.enum(experienceOptions).catch("Less than 1"),
    skills: z.array(z.string()).min(1, { error: "Choose at least one service." }),
    zones: z.array(z.string()).min(1, { error: "Choose at least one area." }),
});

/** Turns zod issues into { field: message } for the form. */
function fieldErrors(error) {
    const out = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (key && !out[key]) out[key] = issue.message;
    }
    return out;
}

/** Bots fill in every field, including the hidden "website" one. */
const isBot = (formData) => String(formData.get("website") ?? "") !== "";

/**
 * Contact form → a row in `enquiries` (Admin › Inbox).
 * Returns { ok: true } or { ok: false, error, fieldErrors }.
 */
export async function submitEnquiry(formData) {
    if (isBot(formData)) return { ok: true };
    const parsed = enquirySchema.safeParse({
        name: formData.get("name") ?? "",
        email: String(formData.get("email") ?? "").trim(),
        phone: formData.get("phone") ?? "",
        type: formData.get("type") ?? "General",
        bookingRef: formData.get("bookingRef") ?? "",
        message: formData.get("message") ?? "",
    });
    if (!parsed.success) {
        return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    }
    const v = parsed.data;
    try {
        await db.insert(enquiries).values({
            name: v.name,
            email: v.email.toLowerCase(),
            phone: v.phone || null,
            type: v.type,
            bookingRef: v.bookingRef || null,
            subject: v.message.split("\n")[0].slice(0, 120),
            message: v.message,
        });
        await db.insert(activityLog).values({ message: `New ${v.type.toLowerCase()} enquiry from ${v.name}` });
        revalidatePath("/admin/inbox");
        return { ok: true };
    } catch (err) {
        console.error("[submitEnquiry]", err);
        return { ok: false, error: "We couldn’t send your message. Please try again or call us." };
    }
}

/**
 * Partner form → a row in `partner_applications` (Admin › Inbox). No login is created.
 * Returns { ok: true } or { ok: false, error, fieldErrors }.
 */
export async function submitPartnerApplication(formData) {
    if (isBot(formData)) return { ok: true };
    const parsed = applicationSchema.safeParse({
        name: formData.get("name") ?? "",
        business: formData.get("business") ?? "",
        phone: formData.get("phone") ?? "",
        email: String(formData.get("email") ?? "").trim(),
        abn: formData.get("abn") ?? "",
        experience: formData.get("experience") ?? "",
        skills: formData.getAll("skills").map(String),
        zones: formData.getAll("zones").map(String),
    });
    if (!parsed.success) {
        return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    }
    const v = parsed.data;
    try {
        // Only keep services and areas that really exist.
        const options = await getSkillAndZoneOptions();
        const skills = v.skills.filter((s) => options.slugs.includes(s));
        const zones = v.zones.filter((z) => options.zones.includes(z));
        if (!skills.length)
            return {
                ok: false,
                error: "Please check the highlighted fields.",
                fieldErrors: { skills: "Choose at least one service." },
            };
        if (!zones.length)
            return { ok: false, error: "Please check the highlighted fields.", fieldErrors: { zones: "Choose at least one area." } };

        await db.insert(partnerApplications).values({
            name: v.name,
            business: v.business,
            email: v.email.toLowerCase(),
            phone: v.phone,
            abn: v.abn.replace(/\s/g, ""),
            experience: v.experience,
            skills,
            zones,
        });
        await db.insert(activityLog).values({ message: `New partner application from ${v.name} (${v.business})` });
        revalidatePath("/admin/inbox");
        return { ok: true };
    } catch (err) {
        console.error("[submitPartnerApplication]", err);
        return { ok: false, error: "We couldn’t send your application. Please try again or call us." };
    }
}