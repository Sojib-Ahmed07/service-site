// src/server/actions/uploads.js
"use server";

/**
 * Upload steps for the UploadButton (components/ui/upload.jsx):
 *   prepareUpload(kind, context) → a signed form for the browser to send straight to Cloudinary
 *   finishUpload(kind, publicId, context) → checks what arrived, returns the ref to save
 * kind: "image" | "logo" | "provider_doc" (admins) · "problem_photo" (customers; context = booking reference)
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { uploadKinds } from "@/lib/files";
import { logError } from "@/server/errors";
import { getAdmin, getCurrentUser } from "@/server/session";
import { checkUpload, signUpload, uploadsEnabled } from "@/server/uploads";

const off = { ok: false, error: "Uploads aren’t switched on yet." };
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Works out the folder this person may upload into for this kind, or returns an error. */
async function folderFor(kind, context) {
    const rules = uploadKinds[kind];
    if (!rules) return { error: "Unknown upload." };
    if (rules.who === "admin") {
        const admin = await getAdmin();
        if (!admin) return { error: "Only admins can do that. Please log in again." };
        return { folder: kind === "provider_doc" ? "sorted/private/docs" : "sorted/site" };
    }
    // Customers: problem photos for one of their own completed bookings.
    const user = await getCurrentUser();
    if (!user) return { error: "Your session has ended. Please log in again." };
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(user.id)) return { error: "Photos can’t be added from this account. Please call us." };
    const [b] = await db
        .select({ status: bookings.status })
        .from(bookings)
        .where(and(eq(bookings.reference, String(context ?? "")), eq(bookings.userId, user.id)))
        .limit(1);
    if (!b) return { error: "We couldn’t find that booking." };
    if (b.status !== "completed") return { error: "You can add photos once the job is completed." };
    return { folder: `sorted/private/problems/${user.id}` };
}

export async function prepareUpload(kind, context) {
    if (!uploadsEnabled()) return off;
    try {
        const who = await folderFor(kind, context);
        if (who.error) return { ok: false, error: who.error };
        return { ok: true, ...signUpload(kind, who.folder) };
    } catch (err) {
        logError("prepareUpload", err);
        return { ok: false, error: "Couldn’t start the upload. Please try again." };
    }
}

export async function finishUpload(kind, publicId, context) {
    if (!uploadsEnabled()) return off;
    try {
        const who = await folderFor(kind, context);
        if (who.error) return { ok: false, error: who.error };
        // Only files in this person's own folder, with an id the server generated.
        const escaped = who.folder.replace(/[/-]/g, "\\$&");
        if (!new RegExp(`^${escaped}/${UUID}$`).test(String(publicId ?? ""))) return { ok: false, error: "That upload isn’t valid." };
        return await checkUpload(kind, publicId);
    } catch (err) {
        logError("finishUpload", err);
        return { ok: false, error: "Couldn’t finish the upload. Please try again." };
    }
}