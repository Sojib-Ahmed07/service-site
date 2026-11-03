"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { categories, zones } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";

/** Contact / quote form → becomes a row in `enquiries` (Admin › Inbox). */
export function ContactForm({ defaultType = "General" }) {
  const [sent, setSent] = useState(false);
  if (sent) return <Sent title="Message sent" body="Thanks — we reply to most messages within one business day." />;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault(); // TODO: Server Action → insert into enquiries
        setSent(true);
      }}
      className="grid gap-5 sm:grid-cols-2"
    >
      <Field label="Name" htmlFor="c-name">
        <Input id="c-name" required autoComplete="name" />
      </Field>
      <Field label="Email" htmlFor="c-email">
        <Input id="c-email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Phone (optional)" htmlFor="c-phone">
        <Input id="c-phone" type="tel" autoComplete="tel" />
      </Field>
      <Field label="What’s it about?" htmlFor="c-type">
        <Select id="c-type" defaultValue={defaultType}>
          <option>General</option>
          <option>Quote</option>
          <option>Booking</option>
          <option value="Complaint">Problem with a job</option>
          <option>Commercial</option>
        </Select>
      </Field>
      <Field label="Booking reference (if any)" htmlFor="c-ref" className="sm:col-span-2">
        <Input id="c-ref" placeholder="HD-00000" />
      </Field>
      <Field label="Message" htmlFor="c-msg" className="sm:col-span-2">
        <Textarea id="c-msg" required rows={5} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg">
          Send message
        </Button>
      </div>
    </form>
  );
}

/** Partner application → `partner_applications` (Admin › Providers › Applications). No login is created. */
export function PartnerForm() {
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <Sent title="Application received" body="Our partnerships team will review it and call you within three business days." />
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="grid gap-5 sm:grid-cols-2"
    >
      <Field label="Your name" htmlFor="p-name">
        <Input id="p-name" required />
      </Field>
      <Field label="Business name" htmlFor="p-biz">
        <Input id="p-biz" required />
      </Field>
      <Field label="Mobile" htmlFor="p-phone">
        <Input id="p-phone" type="tel" required />
      </Field>
      <Field label="Email" htmlFor="p-email">
        <Input id="p-email" type="email" required />
      </Field>
      <Field label="ABN" htmlFor="p-abn">
        <Input id="p-abn" inputMode="numeric" placeholder="11 digits" required />
      </Field>
      <Field label="Years of experience" htmlFor="p-exp">
        <Select id="p-exp">
          <option>Less than 1</option>
          <option>1–3</option>
          <option>3–5</option>
          <option>5+</option>
        </Select>
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Services you offer</legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {categories.map((c) => (
            <Checkbox key={c.slug} label={c.name} name="skills" value={c.slug} />
          ))}
        </div>
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Areas you can work in</legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {zones.map((z) => (
            <Checkbox key={z} label={z} name="zones" value={z} />
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2 space-y-2.5">
        <Checkbox label="I hold at least $10m public liability insurance" required />
        <Checkbox label="I’m happy to complete a national police check" required />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg">
          Submit application
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
