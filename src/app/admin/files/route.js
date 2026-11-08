// src/app/admin/files/route.js
/**
 * GET /admin/files?ref=cld:… — opens a private file (provider document, problem photo).
 * Only signed-in admins; they're sent to a Cloudinary link that stops working after 5 minutes.
 */
import { isPrivateRef } from "@/lib/files";
import { getCurrentUser } from "@/server/session";
import { privateDownloadUrl, uploadsEnabled } from "@/server/uploads";

export const dynamic = "force-dynamic";

const text = (body, status) =>
    new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export async function GET(request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") return text("Please log in as an admin to open this file.", 403);
    const ref = new URL(request.url).searchParams.get("ref") ?? "";
    if (!isPrivateRef(ref)) return text("That file link isn’t valid.", 400);
    if (!uploadsEnabled()) return text("File storage isn’t connected, so this file can’t be opened.", 503);
    const url = privateDownloadUrl(ref);
    if (!url) return text("That file link isn’t valid.", 400);
    return new Response(null, { status: 302, headers: { location: url, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}