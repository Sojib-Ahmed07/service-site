// src/lib/files.js
/**
 * Upload rules shared by the browser and the server (safe in client components).
 *
 * Two kinds of stored file:
 *   - public images (service photos, website images, logo): stored as their full https:// Cloudinary address,
 *     so they work anywhere an image address is accepted.
 *   - private files (provider documents, problem-report photos): stored as "cld:<public id>.<format>".
 *     They can only be opened through /admin/files, which checks the admin is signed in.
 */

export const MB = 1024 * 1024;

/** What each upload is for. `formats` are the file extensions Cloudinary will accept. */
export const uploadKinds = {
    image: {
        private: false,
        formats: ["jpg", "jpeg", "png", "webp"],
        accept: "image/jpeg,image/png,image/webp",
        who: "admin",
    },
    logo: {
        private: false,
        formats: ["png", "jpg", "jpeg", "webp"],
        accept: "image/png,image/jpeg,image/webp",
        who: "admin",
    },
    provider_doc: {
        private: true,
        formats: ["pdf", "jpg", "jpeg", "png", "webp"],
        accept: "application/pdf,image/jpeg,image/png,image/webp",
        who: "admin",
    },
    problem_photo: {
        private: true,
        formats: ["jpg", "jpeg", "png", "webp"],
        accept: "image/jpeg,image/png,image/webp",
        who: "customer",
    },
};

/** Max size: PDFs 10 MB, photos 5 MB. */
export const maxBytesFor = (format) => (String(format).toLowerCase() === "pdf" ? 10 * MB : 5 * MB);

/** Extension of a file name, lower case ("" if none). */
export const extOf = (name) => {
    const m = String(name ?? "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : "";
};

/** Checks a picked file before uploading. Returns an error message or "". */
export function checkFile(kind, file) {
    const rules = uploadKinds[kind];
    if (!rules || !file) return "Choose a file.";
    const ext = extOf(file.name);
    if (!rules.formats.includes(ext)) {
        const names = { pdf: "PDF", jpg: "JPG", jpeg: "JPG", png: "PNG", webp: "WebP" };
        const list = [...new Set(rules.formats.map((f) => names[f] ?? f.toUpperCase()))];
        return `Use a ${list.slice(0, -1).join(", ")}${list.length > 1 ? " or " : ""}${list.at(-1)} file.`;
    }
    if (file.size > maxBytesFor(ext)) return `That file is too big. The limit is ${maxBytesFor(ext) / MB} MB.`;
    if (file.size === 0) return "That file is empty.";
    return "";
}

/** Private file reference, e.g. "cld:sorted/private/docs/0b6f…e1.pdf". */
const PRIVATE_REF = /^cld:(sorted\/private\/(?:docs|problems\/[A-Za-z0-9_-]{1,64})\/[0-9a-f-]{36})\.(pdf|jpg|jpeg|png|webp)$/;

export const isPrivateRef = (ref) => PRIVATE_REF.test(String(ref ?? ""));

/** { publicId, format } for a private ref, or null. */
export function parsePrivateRef(ref) {
    const m = PRIVATE_REF.exec(String(ref ?? ""));
    return m ? { publicId: m[1], format: m[2] } : null;
}

/** Link an admin can open (the server checks they're signed in, then sends a short-lived link). */
export const privateFileHref = (ref) => `/admin/files?ref=${encodeURIComponent(ref)}`;

export const isPdfRef = (ref) => String(ref ?? "").endsWith(".pdf");

/**
 * A Cloudinary image address with automatic format/quality and a max width, e.g. for <img>.
 * Other addresses are returned unchanged.
 */
export function optimisedImage(url, width) {
    const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/.exec(String(url ?? ""));
    if (!m) return url;
    return `${m[1]}f_auto,q_auto,c_limit,w_${Math.round(width)}/${m[2]}`;
}