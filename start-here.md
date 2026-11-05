# START-HERE.md — opening a new chat for Sorted

## How to start a new chat

1. Attach **AI_CONTEXT.md** and this file.
2. Attach a zip of the project **without** `node_modules`, `.next` and `.env.local`. The AI can then read the real
   files instead of guessing.
3. Paste the message below and change the task line if you want something other than the next batch.

---

### Message to paste

```
I'm continuing my project "Sorted" (Next.js 16, JavaScript only, Drizzle + Neon, Better Auth).
AI_CONTEXT.md is the full context. Follow it exactly, especially section 1 (how I work) and section 9 (checklist).
The attached zip is my current project; treat it as the source of truth.

Task: Batch 7 — see "Next batch" in START-HERE.md.
(Or replace this line with: <your task>)

Before writing code:
1. Check the zip matches AI_CONTEXT.md (tell me if any file is missing or outdated).
2. List the files you'll create/change, any packages to install, env vars, and whether I need `npm run db:push`.
3. Ask me any decision you need (e.g. which email/SMS provider) in one short message.

When done: give me separate files (path comment on line 1, where each goes, NEW or replace), numbered setup steps,
and the Progress-log row for AI_CONTEXT.md. No zip.
```

---

## Next batch (Batch 7): real email + SMS notifications

**Goal:** the emails and texts that are currently printed to the terminal actually reach people. Nothing fake: if a
provider isn't configured, keep printing to the terminal and show "not connected" in Settings.

**Decide first (ask the owner):**
- Email provider: Resend (simple, free tier) or Postmark (very reliable delivery). Needs a sending domain with DNS records
  (SPF/DKIM).
- SMS provider: MessageMedia, ClickSend or Twilio (Australian numbers / sender ID). Or skip SMS for now.

**Scope:**
1. `src/server/email.js` → real provider when its env key is set; otherwise keep the terminal log. Keep the `event` switch
   logic. Add a plain, branded HTML layout (logo text, business details from settings, footer) plus plain-text fallback.
2. Respect the customer's own preferences (`users.notifyEmail`, `users.notifySms`) for booking updates; always send
   security emails (password reset) and receipts the admin sends by hand.
3. Emails to cover: booking received, booking confirmed/updated, pro assigned, day-before reminder, job completed +
   review request, cancellation, payment reminder, tax invoice, enquiry reply, password reset, new-booking alert to office.
4. **Day-before reminder + review request** need a scheduled job: a protected route `src/app/api/cron/…/route.js`
   (secret in env, e.g. `CRON_SECRET`) that Vercel Cron calls daily; log each send in `booking_events` so nothing sends twice.
5. SMS (if chosen): send the provider job sheet from the server instead of the `sms:` link (keep the link as a fallback),
   and optional customer SMS for "pro on the way"/reminders. Bring back the SMS switches in Settings › Notifications only
   when SMS really works.
6. Settings › Notifications: show which providers are connected, a "Send test email" button, and per-email on/off for the
   new automatic emails.
7. New env vars documented in `.env.example`; update AI_CONTEXT.md (§3, §5, §7, §10, §11).

## Later batches (in order)

- **Batch 8 — file uploads:** provider documents (insurance, police check, licence) with expiry, service and CMS images,
  problem-report photos. UploadThing, Vercel Blob or Cloudinary; add the host to `next.config.mjs`. Bring back the logo
  upload in Settings › Business.
- **Batch 9 — card payments:** only after the owner picks a provider (see AI_CONTEXT.md §11).
- **Batch 10 — launch:** deploy to Vercel (Sydney) + Neon, production env vars, domain + email DNS, Google OAuth redirect
  for the live domain, `npm run db:push` + `db:seed` (or real data) on production, create the Owner admin, remove sample
  reviews, real business details, lawyer-checked terms, sitemap/robots, basic SEO and analytics.

## If something breaks

- **"Module not found" / an old screen comes back:** a file probably wasn't pasted. Zip the project (no
  `node_modules`/`.next`/`.env.local`) and ask the AI to compare it with AI_CONTEXT.md before changing code.
- **"relation/column … does not exist":** run `npm run db:push` (and `npm run db:content` after Batch 6 changes).
- **Logged out / can't get into admin:** `npm run user:password -- --email you@x.com --password "…" --admin`.
- After pasting files, always stop `npm run dev` (Ctrl+C) and start it again.