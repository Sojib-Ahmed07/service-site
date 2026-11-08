// src/components/admin/provider-form.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText } from "lucide-react";
import { saveProvider } from "@/server/actions/admin-people";
import { weekdays } from "@/lib/constants";
import { isPdfRef, privateFileHref } from "@/lib/files";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/interactive";
import { UploadButton, useUploadsEnabled } from "@/components/ui/upload";
import { useServerForm } from "@/components/ui/use-server-form";

const docTypes = [
  { key: "abn", label: "ABN verified" },
  { key: "insurance", label: "Public liability insurance" },
  { key: "police_check", label: "National police check" },
  { key: "licence", label: "Trade licence" },
];

/**
 * Create or edit a provider. Providers don’t log in — this is the admin’s record of them.
 * `categories` = [{ slug, name }], `zones` = [{ id, name }] from the database.
 * Document files (certificates) upload privately to Cloudinary; they're saved with the rest of the form.
 */
export function ProviderForm({ provider, categories, zones }) {
  const router = useRouter();
  const { toast, toastNode } = useToast();
  const p = provider ?? {
    name: "",
    business: "",
    phone: "",
    email: "",
    abn: "",
    skills: [],
    zones: [],
    availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    status: "onboarding",
    payType: "per_job",
    rate: "",
    payoutSchedule: "Weekly (Friday)",
    bankBsb: "",
    bankAccount: "",
    rating: 0,
    docs: [],
    notes: "",
  };
  const [skills, setSkills] = useState(p.skills);
  const [areas, setAreas] = useState(p.zones);
  const [avail, setAvail] = useState(p.availability);
  const toggle = (set) => (v) => set((x) => (x.includes(v) ? x.filter((i) => i !== v) : [...x, v]));
  const docOf = (type) => p.docs.find((d) => d.type === type);
  const uploads = useUploadsEnabled();
  // Document files: { abn: "cld:…", … }. Saved with the form via hidden inputs.
  const [files, setFiles] = useState(() => Object.fromEntries(docTypes.map((d) => [d.key, docOf(d.key)?.file ?? ""])));
  const [fileErrors, setFileErrors] = useState({});
  const setFile = (key, ref) => setFiles((f) => ({ ...f, [key]: ref }));

  const { pending, result, onSubmit, errors } = useServerForm(saveProvider, {
    onSuccess: (res) => {
      toast(res.message);
      if (!provider) router.push(`/admin/providers/${res.id}`);
      else router.refresh();
    },
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      {provider && <input type="hidden" name="id" value={provider.id} />}
      {skills.map((s) => (
        <input key={s} type="hidden" name="skills" value={s} />
      ))}
      {areas.map((z) => (
        <input key={z} type="hidden" name="zones" value={z} />
      ))}
      {avail.map((d) => (
        <input key={d} type="hidden" name="availability" value={d} />
      ))}

      {result?.error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger">{result.error}</p>}

      <Card>
        <CardHeader title="Contact details" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="pv-name" error={errors.name}>
            <Input id="pv-name" name="name" defaultValue={p.name} required maxLength={120} />
          </Field>
          <Field label="Business name" htmlFor="pv-business" error={errors.business}>
            <Input id="pv-business" name="business" defaultValue={p.business} maxLength={160} />
          </Field>
          <Field label="Mobile" htmlFor="pv-phone" error={errors.phone}>
            <Input id="pv-phone" name="phone" type="tel" defaultValue={p.phone} required maxLength={32} />
          </Field>
          <Field label="Email" htmlFor="pv-email" error={errors.email}>
            <Input id="pv-email" name="email" type="email" defaultValue={p.email} maxLength={255} />
          </Field>
          <Field label="ABN" htmlFor="pv-abn" error={errors.abn}>
            <Input id="pv-abn" name="abn" defaultValue={p.abn} placeholder="11 digits" maxLength={14} />
          </Field>
          <Field label="Status" htmlFor="pv-status" hint="Only active providers can be assigned jobs.">
            <Select id="pv-status" name="status" defaultValue={p.status}>
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <Field label="Rating (0–5)" htmlFor="pv-rating" hint="Your internal quality score.">
            <Input id="pv-rating" name="rating" type="number" min="0" max="5" step="0.1" defaultValue={p.rating} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Services they can do" description="Used to match them to bookings." />
        <div className="flex flex-wrap gap-2 p-5">
          {categories.map((c) => (
            <Chip key={c.slug} on={skills.includes(c.slug)} onClick={() => toggle(setSkills)(c.slug)}>
              {c.name}
            </Chip>
          ))}
        </div>
        {errors.skills && <p className="px-5 pb-4 text-sm text-danger">{errors.skills}</p>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Zones covered" />
          <div className="flex flex-wrap gap-2 p-5">
            {zones.map((z) => (
              <Chip key={z.id} on={areas.includes(z.name)} onClick={() => toggle(setAreas)(z.name)}>
                {z.name}
              </Chip>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Usual working days" />
          <div className="flex flex-wrap gap-2 p-5">
            {weekdays.map((d) => (
              <Chip key={d} on={avail.includes(d)} onClick={() => toggle(setAvail)(d)}>
                {d}
              </Chip>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Pay" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Pay type" htmlFor="pv-paytype">
            <Select id="pv-paytype" name="payType" defaultValue={p.payType}>
              <option value="per_job">Per job</option>
              <option value="hourly">Hourly</option>
              <option value="commission">Commission</option>
            </Select>
          </Field>
          <Field label="Rate" htmlFor="pv-rate" hint="e.g. 70% of job, $68/hr">
            <Input id="pv-rate" name="payRate" defaultValue={p.rate} maxLength={80} />
          </Field>
          <Field label="Payout schedule" htmlFor="pv-schedule">
            <Select id="pv-schedule" name="payoutSchedule" defaultValue={p.payoutSchedule}>
              <option>Weekly (Friday)</option>
              <option>Fortnightly</option>
              <option>Per job</option>
            </Select>
          </Field>
          <Field label="BSB" htmlFor="pv-bsb" error={errors.bankBsb}>
            <Input id="pv-bsb" name="bankBsb" defaultValue={p.bankBsb} placeholder="000-000" maxLength={7} />
          </Field>
          <Field label="Account number" htmlFor="pv-account" className="sm:col-span-2" error={errors.bankAccount}>
            <Input id="pv-account" name="bankAccount" defaultValue={p.bankAccount} maxLength={12} inputMode="numeric" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Documents"
          description={
            uploads
              ? "Upload certificates (PDF or photo, up to 10 MB) and record what you’ve checked. Files are private: only admins can open them. Changes are kept when you save."
              : "Record what you’ve checked and when it expires. Certificate uploads aren’t switched on yet."
          }
        />
        <ul className="divide-y divide-line">
          {docTypes.map((d) => {
            const v = docOf(d.key);
            const state = v ? (v.verified ? "verified" : "missing") : d.key === "licence" ? "na" : "missing";
            const file = files[d.key];
            return (
              <li key={d.key} className="space-y-3 px-5 py-4">
                <input type="hidden" name={`doc_${d.key}_file`} value={file} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="flex-1 font-medium">{d.label}</p>
                  <Select
                    name={`doc_${d.key}_state`}
                    defaultValue={state}
                    className="h-9 w-full text-sm sm:w-48"
                    aria-label={`${d.label} status`}
                  >
                    <option value="verified">Verified</option>
                    <option value="missing">Missing / not checked</option>
                    {d.key === "licence" && <option value="na">Not required</option>}
                  </Select>
                  <Input
                    type="date"
                    name={`doc_${d.key}_expires`}
                    defaultValue={v?.expiresOn ?? ""}
                    className="h-9 w-full text-sm sm:w-40"
                    aria-label={`${d.label} expiry`}
                  />
                </div>
                {(file || uploads) && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {file ? (
                      <>
                        <a
                          href={privateFileHref(file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-ink-900 hover:underline"
                        >
                          <FileText className="size-4" /> View {isPdfRef(file) ? "PDF" : "photo"}
                        </a>
                        <span className="text-muted">·</span>
                      </>
                    ) : (
                      <span className="text-muted">No file uploaded.</span>
                    )}
                    <UploadButton
                      kind="provider_doc"
                      label={file ? "Replace" : "Upload file"}
                      onUploaded={(ref) => setFile(d.key, ref)}
                      onError={(msg) => setFileErrors((e) => ({ ...e, [d.key]: msg }))}
                    />
                    {file && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setFile(d.key, "")}>
                        Remove file
                      </Button>
                    )}
                  </div>
                )}
                {(fileErrors[d.key] || errors[`doc_${d.key}`]) && (
                  <p role="alert" className="text-sm text-danger">
                    {fileErrors[d.key] || errors[`doc_${d.key}`]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Internal notes" />
        <div className="p-5">
          <Textarea name="notes" defaultValue={p.notes} placeholder="Anything other admins should know" maxLength={5000} />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : provider ? "Save provider" : "Add provider"}
        </Button>
      </div>
      {toastNode}
    </form>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        on ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-surface hover:border-brand-500",
      )}
    >
      {children}
    </button>
  );
}