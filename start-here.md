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

Task: next batch — see "Next batch" in START-HERE.md.
(Or replace this line with: <your task>)

Before writing code:
1. Check the zip matches AI_CONTEXT.md (tell me if any file is missing or outdated).
2. List the files you'll create/change, any packages to install, env vars, and whether I need `npm run db:push`.
3. Ask me any decision you need (e.g. which email/SMS provider) in one short message.

When done: give me separate files (path comment on line 1, where each goes, NEW or replace), numbered setup steps,
and the Progress-log row for AI_CONTEXT.md. No zip.
```

---

## Next batch

**Batch 9 — card payments** needs the owner to choose a provider first (see AI_CONTEXT.md §11). If that's still
undecided, do **Batch 10 — launch** next (payments can be added after launch; customers pay after the job).

## Later batches (in order)

- **Batch 9 — card payments:** only after the owner picks a provider (see AI_CONTEXT.md §11).
- **Batch 10 — launch:** deploy to Vercel (Sydney) + Neon, production env vars (incl. `BREVO_API_KEY`, `EMAIL_FROM`,
  `CRON_SECRET`, `CLOUDINARY_*`), upload real photos + logo, domain + Brevo DNS records (DKIM/DMARC), Google OAuth redirect for the live domain, `npm run db:push`
  + `db:seed` (or real data) on production, create the Owner admin, remove sample reviews, real business details,
  lawyer-checked terms, sitemap/robots, basic SEO and analytics. Check Vercel › Cron Jobs shows the daily email job.
- **Later — SMS:** skipped for now (see AI_CONTEXT.md §11).

## If something breaks

- **"Module not found" / an old screen comes back:** a file probably wasn't pasted. Zip the project (no
  `node_modules`/`.next`/`.env.local`) and ask the AI to compare it with AI_CONTEXT.md before changing code.
- **"relation/column … does not exist":** run `npm run db:push` (and `npm run db:content` after Batch 6 changes).
- **No upload buttons:** all three `CLOUDINARY_*` settings must be in `.env.local` (then restart). PDFs open with an
  error → Cloudinary › Settings › Security › tick "Allow delivery of PDF and ZIP files".
- **Emails not arriving:** Admin › Settings › Notifications shows if Brevo is connected; "Send test email" shows Brevo's
  exact error. The most common one: `EMAIL_FROM` isn't a verified sender in Brevo.
- **Logged out / can't get into admin:** `npm run user:password -- --email you@x.com --password "…" --admin`.
- After pasting files, always stop `npm run dev` (Ctrl+C) and start it again.