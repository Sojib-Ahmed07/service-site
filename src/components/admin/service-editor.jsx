"use client";

import { useState } from "react";
import { GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Switch, Tabs, useToast } from "@/components/ui/interactive";

const icons = [
  "cleaning",
  "lease",
  "pest",
  "carpet",
  "garden",
  "handyman",
  "gutter",
  "window",
  "electrical",
  "plumbing",
  "removals",
  "pressure",
];
const groups = ["Cleaning", "Outdoor", "Repairs & trades", "Moving"];

/** Create/edit a service (category) with its packages, extras and FAQs. */
export function ServiceEditor({ service, packages: initialPackages = [], addOns: initialAddOns = [] }) {
  const s = service ?? {
    name: "",
    slug: "",
    group: groups[0],
    icon: icons[0],
    short: "",
    description: "",
    includes: [""],
    faqs: [],
    popular: false,
  };
  const [pkgs, setPkgs] = useState(
    initialPackages.length
      ? initialPackages
      : [{ id: "new-1", name: "", price: 0, duration: "", summary: "", includes: [], popular: false }],
  );
  const [extras, setExtras] = useState(initialAddOns);
  const [includes, setIncludes] = useState(s.includes);
  const [faqs, setFaqs] = useState(s.faqs);
  const { toast, toastNode } = useToast();

  const updatePkg = (i, k, v) => setPkgs((x) => x.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const updateExtra = (i, k, v) => setExtras((x) => x.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  const details = (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Service name">
            <Input defaultValue={s.name} required />
          </Field>
          <Field label="URL slug" hint={`/services/${s.slug || "your-service"}`}>
            <Input defaultValue={s.slug} />
          </Field>
          <Field label="Group">
            <Select defaultValue={s.group}>
              {groups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="Icon">
            <Select defaultValue={s.icon}>
              {icons.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </Select>
          </Field>
          <Field label="Short description" hint="Shown on service cards." className="sm:col-span-2">
            <Input defaultValue={s.short} />
          </Field>
          <Field label="Full description" className="sm:col-span-2">
            <Textarea defaultValue={s.description} rows={4} />
          </Field>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium">What’s included</p>
            <div className="mt-2 space-y-2">
              {includes.map((inc, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={inc} onChange={(e) => setIncludes((x) => x.map((v, j) => (j === i ? e.target.value : v)))} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label="Remove"
                    onClick={() => setIncludes((x) => x.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="subtle" size="sm" onClick={() => setIncludes((x) => [...x, ""])}>
                <Plus /> Add line
              </Button>
            </div>
          </div>
        </div>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Visibility" />
          <div className="space-y-4 p-5 text-sm">
            <label className="flex items-center justify-between gap-4">
              Bookable online <Switch defaultChecked label="Bookable online" />
            </label>
            <label className="flex items-center justify-between gap-4">
              Featured on homepage <Switch defaultChecked={s.popular} label="Featured" />
            </label>
            <label className="flex items-center justify-between gap-4">
              Quote only (no fixed price) <Switch label="Quote only" />
            </label>
          </div>
        </Card>
        <Card>
          <CardHeader title="Image" />
          <div className="p-5">
            <button
              type="button"
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong text-sm text-muted hover:border-brand-500 hover:text-ink-900"
            >
              <ImagePlus className="size-6" /> Upload image
            </button>
          </div>
        </Card>
      </div>
    </div>
  );

  const packagesTab = (
    <div className="space-y-3">
      {pkgs.map((p, i) => (
        <Card key={p.id} className="p-5">
          <div className="flex items-start gap-3">
            <GripVertical className="mt-8 size-4 shrink-0 cursor-grab text-subtle" aria-hidden />
            <div className="grid flex-1 gap-4 sm:grid-cols-6">
              <Field label="Package name" className="sm:col-span-3">
                <Input value={p.name} onChange={(e) => updatePkg(i, "name", e.target.value)} />
              </Field>
              <Field label="Price (AUD, GST incl.)" className="sm:col-span-1">
                <Input type="number" value={p.price} onChange={(e) => updatePkg(i, "price", Number(e.target.value))} />
              </Field>
              <Field label="Duration" className="sm:col-span-2">
                <Input value={p.duration} onChange={(e) => updatePkg(i, "duration", e.target.value)} placeholder="2–3 hrs" />
              </Field>
              <Field label="Summary" className="sm:col-span-4">
                <Input value={p.summary} onChange={(e) => updatePkg(i, "summary", e.target.value)} />
              </Field>
              <Field label="Default provider pay" className="sm:col-span-2" hint="Pre-fills when assigning.">
                <Input type="number" defaultValue={Math.round(p.price * 0.7)} />
              </Field>
              <Field label="Included (comma separated)" className="sm:col-span-6">
                <Input
                  value={p.includes.join(", ")}
                  onChange={(e) =>
                    updatePkg(
                      i,
                      "includes",
                      e.target.value.split(",").map((t) => t.trim()),
                    )
                  }
                />
              </Field>
              <div className="flex items-center justify-between sm:col-span-6">
                <Checkbox
                  checked={!!p.popular}
                  onChange={(e) => updatePkg(i, "popular", e.target.checked)}
                  label="Mark as “Most booked”"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onClick={() => setPkgs((x) => x.filter((_, j) => j !== i))}
                >
                  <Trash2 /> Remove
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setPkgs((x) => [...x, { id: `new-${x.length + 1}`, name: "", price: 0, duration: "", summary: "", includes: [] }])
        }
      >
        <Plus /> Add package
      </Button>
    </div>
  );

  const extrasTab = (
    <Card className="overflow-hidden">
      <div className="divide-y divide-line">
        {extras.map((a, i) => (
          <div key={a.id} className="flex items-end gap-3 px-5 py-4">
            <Field label="Extra" className="flex-1">
              <Input value={a.name} onChange={(e) => updateExtra(i, "name", e.target.value)} />
            </Field>
            <Field label="Price" className="w-32">
              <Input type="number" value={a.price} onChange={(e) => updateExtra(i, "price", Number(e.target.value))} />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Remove"
              onClick={() => setExtras((x) => x.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        {extras.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">No extras yet.</p>}
      </div>
      <div className="border-t border-line p-4">
        <Button
          type="button"
          variant="subtle"
          size="sm"
          onClick={() => setExtras((x) => [...x, { id: `ao-new-${x.length}`, name: "", price: 0 }])}
        >
          <Plus /> Add extra
        </Button>
      </div>
    </Card>
  );

  const faqTab = (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <Card key={i} className="grid gap-3 p-5">
          <Field label="Question">
            <Input value={f.q} onChange={(e) => setFaqs((x) => x.map((v, j) => (j === i ? { ...v, q: e.target.value } : v)))} />
          </Field>
          <Field label="Answer">
            <Textarea
              value={f.a}
              onChange={(e) => setFaqs((x) => x.map((v, j) => (j === i ? { ...v, a: e.target.value } : v)))}
            />
          </Field>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-danger"
            onClick={() => setFaqs((x) => x.filter((_, j) => j !== i))}
          >
            <Trash2 /> Remove
          </Button>
        </Card>
      ))}
      <Button type="button" variant="outline" onClick={() => setFaqs((x) => [...x, { q: "", a: "" }])}>
        <Plus /> Add question
      </Button>
    </div>
  );

  const seoTab = (
    <Card className="grid gap-4 p-5">
      <Field label="Page title" hint="Around 60 characters.">
        <Input defaultValue={s.name ? `${s.name} in Hobart | Sorted` : ""} />
      </Field>
      <Field label="Meta description" hint="Around 155 characters.">
        <Textarea defaultValue={s.description} />
      </Field>
      <Field label="Social share image">
        <Input type="file" accept="image/*" className="py-2" />
      </Field>
    </Card>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        toast("Service saved");
      }}
    >
      <Tabs
        tabs={[
          { id: "details", label: "Details", content: details },
          { id: "packages", label: `Packages (${pkgs.length})`, content: packagesTab },
          { id: "extras", label: `Extras (${extras.length})`, content: extrasTab },
          { id: "faqs", label: `FAQs (${faqs.length})`, content: faqTab },
          { id: "seo", label: "SEO", content: seoTab },
        ]}
      />
      <div className="sticky bottom-0 -mx-4 mt-6 flex justify-end gap-2 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Button type="button" variant="ghost">
          Discard changes
        </Button>
        <Button type="submit">Save service</Button>
      </div>
      {toastNode}
    </form>
  );
}
