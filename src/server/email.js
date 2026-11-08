// src/server/email.js
/**
 * Sends email through Brevo (https://www.brevo.com) when BREVO_API_KEY and EMAIL_FROM are set.
 * Without them:
 *   - in development the email is printed in the server terminal (copy password-reset links from there);
 *   - in production nothing is sent and { ok: false } comes back, so admins never see a fake "sent".
 *
 * Every email uses the same branded layout (business name, details from Admin › Settings › Business)
 * with a plain-text version alongside. Build the content with the helpers in `email-templates.js`.
 *
 * Returns { ok: true, delivered: true, id } | { ok: true, delivered: false, logged: true } (dev, printed)
 *       | { ok: true, skipped: true } (switched off) | { ok: false, error }.
 */
import "server-only";
import { getBusiness, getNotificationSettings } from "@/server/queries/settings";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 10_000;

/** What's connected (never includes secrets). Shown in Admin › Settings › Notifications. */
export function emailStatus() {
    const key = Boolean(process.env.BREVO_API_KEY?.trim());
    const from = process.env.EMAIL_FROM?.trim() ?? "";
    return {
        provider: "Brevo",
        connected: key && isEmail(from),
        hasKey: key,
        from: isEmail(from) ? from : "",
        fromInvalid: Boolean(from) && !isEmail(from),
        printsInTerminal: process.env.NODE_ENV !== "production",
    };
}

/**
 * @param {object} email
 * @param {string} email.to            recipient address
 * @param {string} [email.toName]      recipient name
 * @param {string} email.subject
 * @param {string} [email.event]       an automatic email that can be switched off in Settings › Notifications
 *                                     ("confirmation" | "changes" | "cancellation" | "reminder" | "review")
 * @param {string} [email.tag]         label shown in Brevo's logs (defaults to `event`)
 * @param {string} [email.preheader]   short preview line shown in the inbox
 * @param {string} [email.greeting]    e.g. "Hi Sophie,"
 * @param {string[]} [email.paragraphs]
 * @param {[string, string][]} [email.details]  label/value rows (booking details, totals)
 * @param {{ label: string, href: string }} [email.action]  one button
 * @param {string[]} [email.after]     paragraphs after the button
 * @param {string} [email.signOff]     defaults to "The {business} team"
 * @param {string} [email.replyTo]     defaults to the business email
 */
export async function sendEmail(email) {
    const to = String(email.to ?? "").trim();
    if (!isEmail(to)) return { ok: false, error: "There's no valid email address to send to." };

    if (email.event) {
        const settings = await getNotificationSettings();
        if (settings.emails?.[email.event] === false) return { ok: true, skipped: true };
    }

    const business = await getBusiness();
    const { html, text } = renderEmail(email, business);
    const status = emailStatus();

    if (!status.connected) {
        printEmail(to, email.subject, text);
        if (process.env.NODE_ENV === "production") {
            console.warn("[email] Brevo isn't connected (BREVO_API_KEY / EMAIL_FROM), so this email was NOT delivered.");
            return { ok: false, error: "Email isn't connected yet. Add BREVO_API_KEY and EMAIL_FROM to the server settings." };
        }
        return { ok: true, delivered: false, logged: true };
    }

    const replyTo = [email.replyTo, business.email].find(isEmail);
    const body = {
        sender: { name: (process.env.EMAIL_FROM_NAME?.trim() || business.name || "Sorted").slice(0, 70), email: status.from },
        to: [{ email: to, ...(email.toName ? { name: String(email.toName).slice(0, 70) } : {}) }],
        subject: String(email.subject).slice(0, 200),
        htmlContent: html,
        textContent: text,
        ...(replyTo && replyTo !== status.from ? { replyTo: { email: replyTo, name: business.name } } : {}),
        tags: [email.tag || email.event || "general"],
    };

    try {
        const res = await fetch(BREVO_URL, {
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                "api-key": process.env.BREVO_API_KEY.trim(),
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            console.error(`[email] Brevo refused the email to ${to} (${res.status}):`, data);
            return { ok: false, error: brevoError(res.status, data) };
        }
        return { ok: true, delivered: true, id: data.messageId ?? null };
    } catch (err) {
        console.error(`[email] Couldn't reach Brevo for the email to ${to}:`, err?.message ?? err);
        const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
        return { ok: false, error: timedOut ? "Brevo didn't answer in time. Please try again." : "Couldn't reach Brevo. Please try again." };
    }
}

/** Plain-English message for a Brevo error (shown to admins). */
function brevoError(status, data) {
    const msg = typeof data?.message === "string" ? data.message : "";
    if (status === 401) return "Brevo rejected the API key. Check BREVO_API_KEY.";
    if (status === 402) return "Brevo says the account has no email credits left.";
    if (status === 429) return "Brevo's sending limit was reached. Please try again in a few minutes.";
    if (/sender/i.test(msg)) return `Brevo doesn't accept ${process.env.EMAIL_FROM} as a sender yet. Verify it (or your domain) in Brevo › Senders.`;
    return msg ? `Brevo couldn't send the email: ${msg}` : `Brevo couldn't send the email (error ${status}).`;
}

function printEmail(to, subject, text) {
    const line = "-".repeat(60);
    console.log(`\n${line}\n[email] To: ${to}\n[email] Subject: ${subject}\n\n${text}\n${line}\n`);
}

export function isEmail(v) {
    return typeof v === "string" && /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/.test(v.trim());
}

/* Layout ----------------------------------------------------------------------- */

const esc = (s) =>
    String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

/** Escapes text, keeps line breaks and turns https:// links into links. */
function richText(s) {
    return esc(s)
        .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g, (url) => `<a href="${url}" style="color:#121a33;text-decoration:underline">${url}</a>`)
        .replace(/\r?\n/g, "<br>");
}

const font = "'Instrument Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * Uploaded logo as a PNG, 64px tall (sharp at 32px on high-res screens). Email apps don't all show WebP or SVG,
 * so Cloudinary converts it. Anything that isn't a Cloudinary upload falls back to the text name.
 */
function emailLogo(url) {
    const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+?)(\.[a-z0-9]+)?$/i.exec(String(url ?? ""));
    return m ? `${m[1]}c_fit,h_64/${m[2]}.png` : "";
}

/** Builds the HTML and plain-text versions of an email. Exported for tests and previews. */
export function renderEmail(email, business) {
    const name = business?.name || "Sorted";
    const paragraphs = (email.paragraphs ?? []).filter(Boolean);
    const after = (email.after ?? []).filter(Boolean);
    const details = (email.details ?? []).filter((d) => d && d[1] !== undefined && d[1] !== null && d[1] !== "");
    const signOff = email.signOff ?? `The ${name} team`;
    const logo = emailLogo(business?.logo);
    const footerBits = [business?.address, business?.phone, business?.email, business?.abn ? `ABN ${business.abn}` : ""].filter(
        Boolean,
    );

    /* Plain text */
    const text = [
        email.greeting,
        ...paragraphs,
        details.length ? details.map(([k, v]) => `${k}: ${v}`).join("\n") : "",
        email.action ? `${email.action.label}: ${email.action.href}` : "",
        ...after,
        signOff,
        `--\n${name}${footerBits.length ? `\n${footerBits.join(" · ")}` : ""}`,
    ]
        .filter(Boolean)
        .join("\n\n");

    /* HTML (tables + inline styles so it looks right in Outlook and Gmail) */
    const p = (t) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#121a33">${richText(t)}</p>`;
    const detailRows = details
        .map(
            ([k, v], i) =>
                `<tr><td style="padding:10px 0;${i ? "border-top:1px solid #e4e6ed;" : ""}font-size:14px;color:#5a6280;vertical-align:top;width:40%">${esc(k)}</td>` +
                `<td style="padding:10px 0;${i ? "border-top:1px solid #e4e6ed;" : ""}font-size:14px;color:#121a33;font-weight:600;text-align:right">${richText(v)}</td></tr>`,
        )
        .join("");
    const button = email.action
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:10px;background:#ff6b1a">` +
        `<a href="${esc(email.action.href)}" style="display:inline-block;padding:13px 22px;font-family:${font};font-size:16px;font-weight:600;color:#0b1124;text-decoration:none;border-radius:10px">${esc(email.action.label)}</a>` +
        `</td></tr></table>`
        : "";

    const html = `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(email.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:${font}">
${email.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(email.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 16px;font-family:${font};font-size:20px;font-weight:600;letter-spacing:-0.02em;color:#121a33">${logo ? `<img src="${esc(logo)}" alt="${esc(name)}" height="32" style="display:block;height:32px;width:auto;max-width:200px;border:0">` : esc(name)
        }</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e4e6ed;border-radius:16px;padding:28px 24px;font-family:${font}">
${email.greeting ? p(email.greeting) : ""}
${paragraphs.map(p).join("\n")}
${details.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;border-top:1px solid #e4e6ed;border-bottom:1px solid #e4e6ed">${detailRows}</table>` : ""}
${button}
${after.map(p).join("\n")}
${signOff ? p(signOff) : ""}
</td></tr>
<tr><td style="padding:16px 4px 0;font-family:${font};font-size:12px;line-height:1.6;color:#8d93aa">
${esc(name)}${footerBits.length ? `<br>${footerBits.map(esc).join(" · ")}` : ""}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    return { html, text };
}