// src/server/actions/admin-settings.js
"use server";

/** Admin › Settings: business details, booking rules, notifications, payments and the admin team. */
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "@/db";
import { accounts, activityLog, sessions, siteSettings, users } from "@/db/schema";
import { isValidSlot, slotStartTime } from "@/server/booking-rules";
import { sendEmail } from "@/server/email";
import { testEmail } from "@/server/email-templates";
import { runDailyEmails } from "@/server/notifications";
import { getBusiness } from "@/server/queries/settings";
import { logError } from "@/server/errors";
import { getAdmin } from "@/server/session";

const denied = { ok: false, error: "Only admins can do that. Please log in again." };
const ownersOnly = { ok: false, error: "Only an Owner can change the admin team." };
const failed = (tag, err, msg = "Something went wrong. Please try again.") => {
    logError(tag, err);
    return { ok: false, error: msg };
};
const who = (admin) => `${admin.name.split(" ")[0]} (admin)`;
const activity = (tx, admin, message) => tx.insert(activityLog).values({ actorId: admin.id, actorName: who(admin), message });
const firstError = (parsed) => parsed.error.issues[0]?.message ?? "Please check the form.";
const text = (maxLen) => z.string().trim().max(maxLen, { error: `Keep it under ${maxLen} characters.` });
const whole = (min, maxV, label) =>
    z
        .number({ error: `Enter ${label}.` })
        .int({ error: `${label[0].toUpperCase()}${label.slice(1)} must be a whole number.` })
        .min(min, { error: `${label[0].toUpperCase()}${label.slice(1)} must be at least ${min}.` })
        .max(maxV, { error: `${label[0].toUpperCase()}${label.slice(1)} can be at most ${maxV}.` });

/** Merges `value` into a settings row, keeping fields this form doesn't edit. */
async function putSetting(tx, key, value) {
    const [row] = await tx.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
    const merged = { ...(row?.value ?? {}), ...value };
    await tx
        .insert(siteSettings)
        .values({ key, value: merged })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: merged, updatedAt: new Date() } });
}

async function saveSetting(tag, key, schema, input, message) {
    const admin = await getAdmin();
    if (!admin) return denied;
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstError(parsed) };
    try {
        await db.transaction(async (tx) => {
            await putSetting(tx, key, parsed.data);
            await activity(tx, admin, message);
        });
        // Business details and rules show all over the public site.
        revalidatePath("/", "layout");
        return { ok: true };
    } catch (err) {
        return failed(tag, err);
    }
}

/* Business ------------------------------------------------------------------ */

const optionalUrl = text(255).refine((v) => v === "" || /^https:\/\/\S+$/.test(v), {
    error: "Social links must start with https://",
});
const businessSchema = z.object({
    name: z.string().trim().min(2, { error: "Enter the business name." }).max(80),
    tagline: text(120),
    description: text(300),
    abn: text(20).refine((v) => v === "" || /^\d{11}$/.test(v.replace(/\s/g, "")), {
        error: "An ABN has 11 digits.",
    }),
    phone: z
        .string()
        .trim()
        .min(1, { error: "Enter a phone number." })
        .max(32)
        .refine((v) => /^[\d\s()+-]{8,}$/.test(v), { error: "Enter a valid phone number." }),
    email: z.email({ error: "Enter a valid email address." }).max(255),
    address: text(200),
    hours: text(80),
    city: z.string().trim().min(2, { error: "Enter the city." }).max(60),
    region: z.string().trim().min(2, { error: "Enter the region you cover." }).max(80),
    social: z.object({ facebook: optionalUrl, instagram: optionalUrl }),
    // Uploaded logo (Cloudinary https:// address) or "" for the text logo.
    logo: text(500).refine((v) => v === "" || /^https:\/\/\S+$/.test(v), { error: "The logo must be an uploaded image." }),
});

export async function saveBusiness(input) {
    return saveSetting("saveBusiness", "business", businessSchema, input, "Updated business details");
}

/* Booking rules ------------------------------------------------------------- */

const bookingSchema = z.object({
    minNoticeHours: whole(0, 336, "the minimum notice"),
    windowDays: whole(1, 365, "the booking window"),
    freeCancelHours: whole(0, 168, "the free change period"),
    lateCancelFeePercent: whole(0, 100, "the late change fee"),
    guaranteeHours: whole(1, 720, "the guarantee window"),
    maxJobsPerSlot: whole(0, 500, "the max jobs per window"),
    sundays: z.boolean(),
    timeSlots: z
        .array(
            z
                .string()
                .trim()
                .max(40)
                .refine(isValidSlot, { error: "Write arrival windows like 7:00–9:00am or 11:00am–1:00pm." }),
        )
        .min(1, { error: "Keep at least one arrival window." })
        .max(12, { error: "Up to 12 arrival windows." }),
});

export async function saveBookingRules(input) {
    const parsed = bookingSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstError(parsed) };
    const slots = parsed.data.timeSlots.map((s) => s.replace(/\s*-\s*/, "–"));
    if (new Set(slots.map((s) => s.toLowerCase())).size !== slots.length) {
        return { ok: false, error: "Two arrival windows are the same." };
    }
    // Earliest window first, so the booking calendar reads in order.
    const sorted = [...slots].sort((a, b) => slotStartTime(a).localeCompare(slotStartTime(b)));
    return saveSetting(
        "saveBookingRules",
        "booking",
        bookingSchema,
        { ...parsed.data, timeSlots: sorted },
        "Updated booking rules",
    );
}

/* Notifications ------------------------------------------------------------- */

const notificationSchema = z.object({
    jobSheetTemplate: z.string().trim().min(10, { error: "The job sheet template is empty." }).max(1000),
    emails: z.object({
        confirmation: z.boolean(),
        changes: z.boolean(),
        cancellation: z.boolean(),
        reminder: z.boolean(),
        review: z.boolean(),
    }),
    adminNewBooking: z.boolean(),
    adminChanges: z.boolean(),
});

export async function saveNotifications(input) {
    return saveSetting("saveNotifications", "notifications", notificationSchema, input, "Updated notification settings");
}

/** Sends a test email to the signed-in admin. */
export async function sendTestEmail() {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const sent = await sendEmail(testEmail(await getBusiness(), admin));
        if (!sent.ok) return { ok: false, error: sent.error };
        return {
            ok: true,
            message: sent.delivered
                ? `Test email sent to ${admin.email}. Check your inbox (and spam folder).`
                : "Email isn’t connected yet, so the test email was printed in the server terminal.",
        };
    } catch (err) {
        return failed("sendTestEmail", err);
    }
}

/** Runs the daily emails (reminders + review requests) now. Never sends the same email twice. */
export async function runDailyEmailsNow() {
    const admin = await getAdmin();
    if (!admin) return denied;
    try {
        const r = await runDailyEmails();
        const sent = r.reminders.sent + r.reviews.sent;
        const failedCount = r.reminders.failed + r.reviews.failed;
        await db
            .insert(activityLog)
            .values({ actorId: admin.id, actorName: who(admin), message: `Ran the daily emails (${sent} sent)` });
        revalidatePath("/admin", "layout");
        const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
        const summary = `${plural(r.reminders.sent, "reminder")} and ${plural(r.reviews.sent, "review request")} ${r.connected ? "sent" : "printed in the server terminal"
            }`;
        if (failedCount) return { ok: false, error: `${summary}. ${plural(failedCount, "email")} failed: ${r.errors.join(" ")}` };
        const skipped = r.reminders.skipped + r.reviews.skipped;
        const off = skipped ? ` ${plural(skipped, "email")} skipped because ${skipped === 1 ? "it’s" : "they’re"} switched off.` : "";
        return { ok: true, message: sent ? `${summary}.${off}` : `Nothing to send right now.${off}` };
    } catch (err) {
        return failed("runDailyEmailsNow", err);
    }
}

/* Payments ------------------------------------------------------------------ */

const paymentSchema = z.object({ invoiceDays: whole(0, 60, "the invoice terms") });

export async function savePaymentSettings(input) {
    return saveSetting("savePaymentSettings", "payments", paymentSchema, input, "Updated payment settings");
}

/* Team ---------------------------------------------------------------------- */

const teamRoles = ["Owner", "Operations", "Support"];
const isOwner = (admin) => admin.teamRole === "Owner";

const addAdminSchema = z.object({
    name: text(120),
    email: z.email({ error: "Enter a valid email address." }).max(255),
    teamRole: z.enum(teamRoles),
    password: z.string().max(128),
});

/**
 * Gives someone admin access. If they already have an account it's upgraded (they keep
 * their password). Otherwise an account is created with the temporary password you
 * choose — share it with them and ask them to change it in Account › Settings.
 */
export async function addAdmin(input) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (!isOwner(admin)) return ownersOnly;
    const parsed = addAdminSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstError(parsed) };
    const d = parsed.data;
    const email = d.email.toLowerCase();
    try {
        const [existing] = await db
            .select()
            .from(users)
            .where(eq(sql`lower(${users.email})`, email))
            .limit(1);
        if (existing) {
            if (existing.role === "admin") return { ok: false, error: "That person is already an admin." };
            if (existing.blocked) return { ok: false, error: "That account is blocked. Unblock it in Customers first." };
            await db.transaction(async (tx) => {
                await tx
                    .update(users)
                    .set({ role: "admin", teamRole: d.teamRole, updatedAt: new Date() })
                    .where(eq(users.id, existing.id));
                await activity(tx, admin, `Made ${existing.name} an admin (${d.teamRole})`);
            });
            revalidatePath("/admin/settings");
            return { ok: true, created: false };
        }

        if (d.name.length < 2) return { ok: false, error: "Enter their name." };
        if (d.password.length < 8) return { ok: false, error: "Set a temporary password of at least 8 characters." };
        const hash = await hashPassword(d.password);
        await db.transaction(async (tx) => {
            const id = randomUUID();
            await tx.insert(users).values({
                id,
                name: d.name,
                email,
                emailVerified: true,
                role: "admin",
                teamRole: d.teamRole,
            });
            await tx.insert(accounts).values({ id: randomUUID(), userId: id, accountId: id, providerId: "credential", password: hash });
            await activity(tx, admin, `Added ${d.name} as an admin (${d.teamRole})`);
        });
        revalidatePath("/admin/settings");
        return { ok: true, created: true };
    } catch (err) {
        if (err?.code === "23505" || err?.cause?.code === "23505") {
            return { ok: false, error: "An account with that email already exists." };
        }
        return failed("addAdmin", err);
    }
}

async function ownerCount(tx, exceptId) {
    const [r] = await tx
        .select({ n: sql`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.teamRole, "Owner"), eq(users.blocked, false), ne(users.id, exceptId)));
    return r.n;
}

export async function setTeamRole(userId, teamRole) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (!isOwner(admin)) return ownersOnly;
    if (!teamRoles.includes(teamRole)) return { ok: false, error: "Pick a role." };
    try {
        const res = await db.transaction(async (tx) => {
            const [u] = await tx
                .select()
                .from(users)
                .where(and(eq(users.id, String(userId)), eq(users.role, "admin")))
                .limit(1);
            if (!u) return { ok: false, error: "That admin no longer exists." };
            if (u.teamRole === "Owner" && teamRole !== "Owner" && (await ownerCount(tx, u.id)) === 0) {
                return { ok: false, error: "There must always be at least one Owner." };
            }
            await tx.update(users).set({ teamRole, updatedAt: new Date() }).where(eq(users.id, u.id));
            await activity(tx, admin, `Changed ${u.name}’s role to ${teamRole}`);
            return { ok: true };
        });
        if (res.ok) revalidatePath("/admin", "layout");
        return res;
    } catch (err) {
        return failed("setTeamRole", err);
    }
}

/** Removes admin access (the account stays, as a customer) and signs them out. */
export async function removeAdmin(userId) {
    const admin = await getAdmin();
    if (!admin) return denied;
    if (!isOwner(admin)) return ownersOnly;
    if (String(userId) === admin.id) return { ok: false, error: "You can’t remove yourself. Ask another Owner." };
    try {
        const res = await db.transaction(async (tx) => {
            const [u] = await tx
                .select()
                .from(users)
                .where(and(eq(users.id, String(userId)), eq(users.role, "admin")))
                .limit(1);
            if (!u) return { ok: false, error: "That admin no longer exists." };
            if (u.teamRole === "Owner" && (await ownerCount(tx, u.id)) === 0) {
                return { ok: false, error: "There must always be at least one Owner." };
            }
            await tx.update(users).set({ role: "customer", teamRole: null, updatedAt: new Date() }).where(eq(users.id, u.id));
            await tx.delete(sessions).where(eq(sessions.userId, u.id));
            await activity(tx, admin, `Removed admin access for ${u.name}`);
            return { ok: true };
        });
        if (res.ok) revalidatePath("/admin", "layout");
        return res;
    } catch (err) {
        return failed("removeAdmin", err);
    }
}