// src/components/site/forms.jsx
"use client";

import { CircleCheck } from "lucide-react";
import { enquiryTypes, experienceOptions } from "@/lib/constants";
import { submitEnquiry, submitPartnerApplication } from "@/server/actions/enquiries";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { useServerForm } from "@/components/ui/use-server-form";

const typeLabels = { Complaint: "Problem with a job" };

/** Hidden from people; bots fill it in, and the server then ignores the submission. */
function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** Contact / quote form → a row in `enquiries` (Admin › Inbox). */
export function ContactForm({ defaultType = "General" }) {
  const { pending, result, onSubmit, errors } = useServerForm(submitEnquiry);
  if (result?.ok) return <Sent title="Message sent" body="Thanks — we reply to most messages within one business day." />;
  return (
    <form onSubmit={onSubmit} className="relative grid gap-5 sm:grid-cols-2">
      <Honeypot />
      <Field label="Name" htmlFor="c-name" error={errors.name}>
        <Input id="c-name" name="name" required autoComplete="name" maxLength={120} />
      </Field>
      <Field label="Email" htmlFor="c-email" error={errors.email}>
        <Input id="c-email" name="email" type="email" required autoComplete="email" maxLength={255} />
      </Field>
      <Field label="Phone (optional)" htmlFor="c-phone" error={errors.phone}>
        <Input id="c-phone" name="phone" type="tel" autoComplete="tel" maxLength={32} />
      </Field>
      <Field label="What’s it about?" htmlFor="c-type">
        <Select id="c-type" name="type" defaultValue={enquiryTypes.includes(defaultType) ? defaultType : "General"}>
          {enquiryTypes.map((t) => (
            <option key={t} value={t}>
              {typeLabels[t] ?? t}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Booking reference (if any)" htmlFor="c-ref" className="sm:col-span-2" error={errors.bookingRef}>
        <Input id="c-ref" name="bookingRef" placeholder="HD-00000" maxLength={16} className="uppercase" />
      </Field>
      <Field label="Message" htmlFor="c-msg" className="sm:col-span-2" error={errors.message}>
        <Textarea id="c-msg" name="message" required rows={5} maxLength={5000} />
      </Field>
      {result?.error && <p className="text-sm text-danger sm:col-span-2">{result.error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Partner application → `partner_applications` (Admin › Inbox). No login is created.
 * `categories` and `zones` come from the database (passed by app/(site)/partners/page.jsx).
 */
export function PartnerForm({ categories = [], zones = [] }) {
  const { pending, result, onSubmit, errors } = useServerForm(submitPartnerApplication);
  if (result?.ok)
    return (
      <Sent title="Application received" body="Our partnerships team will review it and call you within three business days." />
    );
  return (
    <form onSubmit={onSubmit} className="relative grid gap-5 sm:grid-cols-2">
      <Honeypot />
      <Field label="Your name" htmlFor="p-name" error={errors.name}>
        <Input id="p-name" name="name" required maxLength={120} autoComplete="name" />
      </Field>
      <Field label="Business name" htmlFor="p-biz" error={errors.business}>
        <Input id="p-biz" name="business" required maxLength={160} autoComplete="organization" />
      </Field>
      <Field label="Mobile" htmlFor="p-phone" error={errors.phone}>
        <Input id="p-phone" name="phone" type="tel" required maxLength={32} autoComplete="tel" />
      </Field>
      <Field label="Email" htmlFor="p-email" error={errors.email}>
        <Input id="p-email" name="email" type="email" required maxLength={255} autoComplete="email" />
      </Field>
      <Field label="ABN" htmlFor="p-abn" error={errors.abn}>
        <Input id="p-abn" name="abn" inputMode="numeric" placeholder="11 digits" required maxLength={14} />
      </Field>
      <Field label="Years of experience" htmlFor="p-exp">
        <Select id="p-exp" name="experience" defaultValue={experienceOptions[0]}>
          {experienceOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Services you offer</legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {categories.map((c) => (
            <Checkbox key={c.slug} label={c.name} name="skills" value={c.slug} />
          ))}
        </div>
        {errors.skills && <p className="mt-2 text-sm text-danger">{errors.skills}</p>}
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Areas you can work in</legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {zones.map((z) => (
            <Checkbox key={z} label={z} name="zones" value={z} />
          ))}
        </div>
        {errors.zones && <p className="mt-2 text-sm text-danger">{errors.zones}</p>}
      </fieldset>
      <div className="sm:col-span-2 space-y-2.5">
        <Checkbox label="I hold at least $10m public liability insurance" required />
        <Checkbox label="I’m happy to complete a national police check" required />
      </div>
      {result?.error && <p className="text-sm text-danger sm:col-span-2">{result.error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Submit application"}
        </Button>
      </div>
    </form>
  );
}

function Sent({ title, body }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <CircleCheck className="size-12 text-brand-600" />
      <p className="text-xl font-semibold">{title}</p>
      <p className="max-w-sm text-muted">{body}</p>
    </div>
  );
}