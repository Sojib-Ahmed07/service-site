// src/server/uploads.js
/**
 * Cloudinary storage (server only). Needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 *
 * Flow (files never pass through our server, which keeps big PDFs within Vercel's request limits):
 *   1. signUpload()  — the server picks the file's id and signs the upload (only it knows the API secret).
 *   2. The browser sends the file straight to Cloudinary with that signature.
 *   3. checkUpload() — the server asks Cloudinary what actually arrived (size, format) before anything is saved.
 * Private files use Cloudinary's "authenticated" type: they can't be opened by address, only through
 * privateDownloadUrl(), a link that stops working after 5 minutes.
 */
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { maxBytesFor, MB, parsePrivateRef, uploadKinds } from "@/lib/files";

const API = "https://api.cloudinary.com/v1_1";

function config() {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
    const key = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
    const secret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
    return { cloud, key, secret, ok: Boolean(cloud && key && secret) && /^[a-z0-9_-]+$/i.test(cloud) };
}

/** True when all three Cloudinary settings are present. */
export const uploadsEnabled = () => config().ok;

/**
 * Cloudinary's request signature: parameters sorted by name, joined as a=1&b=2, the API secret appended,
 * then SHA-1 (hex). Empty values are left out, arrays are comma-joined.
 */
export function signParams(params, secret = config().secret) {
    const toSign = Object.keys(params)
        .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
        .sort()
        .map((k) => `${k}=${Array.isArray(params[k]) ? params[k].join(",") : params[k]}`)
        .join("&");
    return createHash("sha1").update(toSign + secret).digest("hex");
}

const now = () => Math.floor(Date.now() / 1000);

/**
 * Signs one upload. `folder` is decided by the caller (it encodes who may use the file).
 * Returns { url, fields } for the browser to POST (multipart) with the file added as "file".
 */
export function signUpload(kind, folder) {
    const c = config();
    const rules = uploadKinds[kind];
    if (!c.ok || !rules) throw new Error("UPLOADS_OFF");
    const params = {
        public_id: `${folder}/${randomUUID()}`,
        type: rules.private ? "authenticated" : "upload",
        allowed_formats: rules.formats.join(","),
        timestamp: now(),
    };
    return {
        url: `${API}/${c.cloud}/image/upload`,
        fields: { ...params, api_key: c.key, signature: signParams(params, c.secret) },
    };
}

/**
 * Asks Cloudinary what was uploaded (never trusts the browser) and checks its format and size.
 * Too big or the wrong type → the file is deleted and { ok: false, error } returned.
 * Returns { ok: true, ref } — the full https address for public files, "cld:<id>.<format>" for private ones.
 */
export async function checkUpload(kind, publicId) {
    const c = config();
    const rules = uploadKinds[kind];
    if (!c.ok || !rules) return { ok: false, error: "Uploads aren’t switched on yet." };
    const type = rules.private ? "authenticated" : "upload";
    const path = String(publicId).split("/").map(encodeURIComponent).join("/");
    let res;
    try {
        res = await fetch(`${API}/${c.cloud}/resources/image/${type}/${path}`, {
            headers: { authorization: `Basic ${Buffer.from(`${c.key}:${c.secret}`).toString("base64")}` },
            signal: AbortSignal.timeout(10_000),
            cache: "no-store",
        });
    } catch (err) {
        console.error("[uploads] Couldn't reach Cloudinary:", err?.message ?? err);
        return { ok: false, error: "Couldn’t reach Cloudinary. Please try again." };
    }
    if (res.status === 404) return { ok: false, error: "The upload didn’t finish. Please try again." };
    if (!res.ok) {
        console.error(`[uploads] Cloudinary refused the check for ${publicId} (${res.status}):`, await res.text().catch(() => ""));
        return { ok: false, error: res.status === 401 ? "Cloudinary rejected the API key. Check the Cloudinary settings." : "Couldn’t check the upload. Please try again." };
    }
    const info = await res.json();
    const format = String(info.format ?? "").toLowerCase();
    if (!rules.formats.includes(format)) {
        await destroyFile(publicId, type);
        return { ok: false, error: "That type of file isn’t allowed here." };
    }
    if (Number(info.bytes) > maxBytesFor(format)) {
        await destroyFile(publicId, type);
        return { ok: false, error: `That file is too big. The limit is ${maxBytesFor(format) / MB} MB.` };
    }
    const ref = rules.private ? `cld:${publicId}.${format}` : String(info.secure_url ?? "");
    if (!ref.startsWith(rules.private ? "cld:" : "https://")) return { ok: false, error: "Couldn’t check the upload. Please try again." };
    return { ok: true, ref, format, bytes: Number(info.bytes) };
}

/** Deletes a file from Cloudinary. Never throws (a leftover file only costs a little storage). */
export async function destroyFile(publicId, type = "upload") {
    const c = config();
    if (!c.ok || !publicId) return false;
    const params = { public_id: publicId, type, invalidate: "true", timestamp: now() };
    try {
        const res = await fetch(`${API}/${c.cloud}/image/destroy`, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ ...params, timestamp: String(params.timestamp), api_key: c.key, signature: signParams(params, c.secret) }),
            signal: AbortSignal.timeout(10_000),
            cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data.result && data.result !== "ok" && data.result !== "not found")) {
            console.error(`[uploads] Couldn't delete ${publicId}:`, res.status, data);
            return false;
        }
        return true;
    } catch (err) {
        console.error(`[uploads] Couldn't delete ${publicId}:`, err?.message ?? err);
        return false;
    }
}

/** Deletes a private file by its "cld:…" ref. */
export async function destroyPrivate(ref) {
    const p = parsePrivateRef(ref);
    return p ? destroyFile(p.publicId, "authenticated") : false;
}

/** A link to a private file that works for 5 minutes. Null if the ref isn't valid or uploads are off. */
export function privateDownloadUrl(ref, seconds = 300) {
    const c = config();
    const p = parsePrivateRef(ref);
    if (!c.ok || !p) return null;
    const params = { public_id: p.publicId, format: p.format, type: "authenticated", expires_at: now() + seconds, timestamp: now() };
    const qs = new URLSearchParams({
        ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
        signature: signParams(params, c.secret),
        api_key: c.key,
    });
    return `${API}/${c.cloud}/image/download?${qs}`;
}