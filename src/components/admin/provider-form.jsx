"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import { categories, zones } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/interactive";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const docTypes = [
  { key: "abn", label: "ABN verified" },
  { key: "insurance", label: "Public liability insurance" },
  { key: "policeCheck", label: "National police check" },
  { key: "licence", label: "Trade licence (if required)" },
];

/** Create or edit a provider. Providers don’t log in — this is the admin’s record of them. */
export function ProviderForm({ provider }) {
  const p = provider ?? {
    name: "",
    business: "",
    phone: "",
    email: "",
    skills: [],
    zones: [],
    availability: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    status: "onboarding",
    payType: "Per job",
    rate: "",
    docs: {},
    notes: "",
  };
  const [skills, setSkills] = useState(p.skills);
  const [areas, setAreas] = useState(p.zones);
  const [avail, setAvail] = useState(p.availability);
  const { toast, toastNode } = useToast();
  const toggle = (set) => (v) => set((x) => (x.includes(v) ? x.filter((i) => i !== v) : [...x, v]));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        toast(provider ? "Provider saved" : "Provider added");
      }}
    >
      <Card>
        <CardHeader title="Contact details" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name">
            <Input defaultValue={p.name} required />
          </Field>
          <Field label="Business name">
            <Input defaultValue={p.business} />
          </Field>
          <Field label="Mobile">
            <Input type="tel" defaultValue={p.phone} required />
          </Field>
          <Field label="Email">
            <Input type="email" defaultValue={p.email} />
          </Field>
          <Field label="ABN">
            <Input placeholder="11 digits" />
          </Field>
          <Field label="Status">
            <Select defaultValue={p.status}>
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
            </Select>
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
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Zones covered" />
          <div className="flex flex-wrap gap-2 p-5">
            {zones.map((z) => (
              <Chip key={z} on={areas.includes(z)} onClick={() => toggle(setAreas)(z)}>
                {z}
              </Chip>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Usual working days" />
          <div className="flex flex-wrap gap-2 p-5">
            {days.map((d) => (
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
          <Field label="Pay type">
            <Select defaultValue={p.payType}>
              <option>Per job</option>
              <option>Hourly</option>
              <option>Commission</option>
            </Select>
          </Field>
          <Field label="Rate" hint="e.g. 70% of job, $68/hr">
            <Input defaultValue={p.rate} />
          </Field>
          <Field label="Payout schedule">
            <Select>
              <option>Weekly (Friday)</option>
              <option>Fortnightly</option>
              <option>Per job</option>
            </Select>
          </Field>
          <Field label="BSB">
            <Input placeholder="000-000" />
          </Field>
          <Field label="Account number" className="sm:col-span-2">
            <Input />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Documents" description="Upload certificates and set expiry dates for reminders." />
        <ul className="divide-y divide-line">
          {docTypes.map((d) => {
            const v = p.docs?.[d.key];
            return (
              <li key={d.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-medium">{d.label}</p>
                  <p className={cn("text-sm", v ? "text-ink-900" : v === null ? "text-muted" : "text-warn")}>
                    {v ? "Verified" : v === null ? "Not required for their services" : "Missing"}
                  </p>
                </div>
                <Input type="date" className="h-9 w-full text-sm sm:w-40" aria-label={`${d.label} expiry`} />
                <Button type="button" variant="outline" size="sm">
                  <FileUp /> Upload
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Internal notes" />
        <div className="p-5">
          <Textarea defaultValue={p.notes} placeholder="Anything other admins should know" />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" size="lg">
          {provider ? "Save provider" : "Add provider"}
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
