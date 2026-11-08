// src/components/admin/service-editor.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveService } from "@/server/actions/admin-catalog";
import { serviceGroups, serviceIcons } from "@/lib/constants";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { ImageInput } from "@/components/ui/upload";
import { Switch, Tabs, useToast } from "@/components/ui/interactive";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

let tempId = 0;
const key = () => `new-${++tempId}`;

/**
 * Create/edit a service with its packages, extras, FAQs and SEO. Everything is kept in
 * state (tabs unmount when hidden) and saved in one go by saveService().
 */
export function ServiceEditor({ service, packages: initialPackages = [], addOns: initialAddOns = [] }) {
  const router = useRouter();
  const { toast, toastNode } = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [slugTouched, setSlugTouched] = useState(Boolean(service));
  const [s, setS] = useState(
    service ?? {
      name: "",
      slug: "",
      group: serviceGroups[0],
      icon: serviceIcons[0],
      short: "",
      description: "",
      priceUnit: "",
      includes: [""],
      faqs: [],
      heroImage: "",
      seoTitle: "",
      seoDescription: "",
      featured: false,
      bookable: false,
    },
  );
  const [pkgs, setPkgs] = useState(
    (initialPackages.length
      ? initialPackages
      : [{ name: "", price: "", duration: "", summary: "", includes: [], popular: false }]
    ).map((p) => ({ ...p, key: p.id ? `p${p.id}` : key(), includesText: (p.includes ?? []).join(", ") })),
  );
  const [extras, setExtras] = useState(initialAddOns.map((a) => ({ ...a, key: `a${a.id}` })));
  const [dirty, setDirty] = useState(false);

  const set = (k, v) => {
    setDirty(true);
    setS((x) => ({ ...x, [k]: v }));
  };
  const updatePkg = (i, k, v) => {
    setDirty(true);
    setPkgs((x) => x.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  };
  const movePkg = (i, d) =>
    setPkgs((x) => {
      const j = i + d;
      if (j < 0 || j >= x.length) return x;
      const y = [...x];
      [y[i], y[j]] = [y[j], y[i]];
      setDirty(true);
      return y;
    });
  const updateExtra = (i, k, v) => {
    setDirty(true);
    setExtras((x) => x.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  };

  const save = () => {
    setError("");
    start(async () => {
      const res = await saveService({
        id: service?.id,
        ...s,
        includes: s.includes.map((t) => t.trim()).filter(Boolean),
        faqs: s.faqs.map((f) => ({ q: f.q.trim(), a: f.a.trim() })).filter((f) => f.q || f.a),
        packages: pkgs.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price === "" ? null : Number(p.price),
          duration: p.duration,
          summary: p.summary,
          includes: p.includesText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          popular: Boolean(p.popular),
        })),
        addOns: extras.map((a) => ({ id: a.id, name: a.name, price: a.price === "" ? null : Number(a.price) })),
      });
      if (!res.ok) {
        setError(res.error);
        toast(res.error);
        return;
      }
      setDirty(false);
      toast("Service saved");
      if (!service || res.slug !== service.slug) router.replace(`/admin/services/${res.slug}`);
      else router.refresh();
    });
  };

  const details = (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Service name" htmlFor="sv-name">
            <Input
              id="sv-name"
              value={s.name}
              maxLength={120}
              onChange={(e) => {
                set("name", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="URL slug" htmlFor="sv-slug" hint={`/services/${s.slug || "your-service"}`}>
            <Input
              id="sv-slug"
              value={s.slug}
              maxLength={80}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase());
              }}
            />
          </Field>
          <Field label="Group" htmlFor="sv-group">
            <Select id="sv-group" value={s.group} onChange={(e) => set("group", e.target.value)}>
              {serviceGroups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="Icon" htmlFor="sv-icon">
            <div className="flex items-center gap-3">
              <CategoryIcon icon={s.icon} size="sm" />
              <Select id="sv-icon" value={s.icon} onChange={(e) => set("icon", e.target.value)}>
                {serviceIcons.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </Select>
            </div>
          </Field>
          <Field label="Pricing" htmlFor="sv-unit" hint="Hourly services show “/hr” after the price.">
            <Select id="sv-unit" value={s.priceUnit} onChange={(e) => set("priceUnit", e.target.value)}>
              <option value="">Fixed price per package</option>
              <option value="/hr">Per hour</option>
            </Select>
          </Field>
          <Field label="Short description" htmlFor="sv-short" hint="Shown on service cards." className="sm:col-span-2">
            <Input id="sv-short" value={s.short} maxLength={200} onChange={(e) => set("short", e.target.value)} />
          </Field>
          <Field label="Full description" htmlFor="sv-desc" className="sm:col-span-2">
            <Textarea
              id="sv-desc"
              value={s.description}
              rows={4}
              maxLength={5000}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium">What’s included</p>
            <div className="mt-2 space-y-2">
              {s.includes.map((inc, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={inc}
                    maxLength={200}
                    aria-label={`Included item ${i + 1}`}
                    onChange={(e) =>
                      set(
                        "includes",
                        s.includes.map((v, j) => (j === i ? e.target.value : v)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label="Remove"
                    onClick={() =>
                      set(
                        "includes",
                        s.includes.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="subtle" size="sm" onClick={() => set("includes", [...s.includes, ""])}>
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
              Bookable online <Switch checked={s.bookable} onChange={(v) => set("bookable", v)} label="Bookable online" />
            </label>
            <label className="flex items-center justify-between gap-4">
              Featured (“Popular”) <Switch checked={s.featured} onChange={(v) => set("featured", v)} label="Featured" />
            </label>
            <p className="text-xs text-muted">Featured services show on the home page and in the search suggestions.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Image" />
          <div className="p-5">
            <ImageInput
              id="sv-image"
              label="Service image"
              value={s.heroImage}
              onChange={(v) => set("heroImage", v.trim())}
              sizes={600}
              aspect="aspect-[4/3]"
            />
          </div>
        </Card>
      </div>
    </div>
  );

  const packagesTab = (
    <div className="space-y-3">
      {pkgs.map((p, i) => (
        <Card key={p.key} className="p-5">
          <div className="flex items-start gap-3">
            <div className="mt-6 flex flex-col gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Move up"
                onClick={() => movePkg(i, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Move down"
                onClick={() => movePkg(i, 1)}
              >
                <ArrowDown />
              </Button>
            </div>
            <div className="grid flex-1 gap-4 sm:grid-cols-6">
              <Field label="Package name" className="sm:col-span-3">
                <Input value={p.name} maxLength={120} onChange={(e) => updatePkg(i, "name", e.target.value)} />
              </Field>
              <Field label={`Price (AUD, GST incl.)${s.priceUnit ? " per hour" : ""}`} className="sm:col-span-1">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.price}
                  onChange={(e) => updatePkg(i, "price", e.target.value)}
                />
              </Field>
              <Field label="Duration" className="sm:col-span-2">
                <Input
                  value={p.duration}
                  maxLength={40}
                  onChange={(e) => updatePkg(i, "duration", e.target.value)}
                  placeholder="2–3 hrs"
                />
              </Field>
              <Field label="Summary" className="sm:col-span-6">
                <Input value={p.summary} maxLength={240} onChange={(e) => updatePkg(i, "summary", e.target.value)} />
              </Field>
              <Field label="Included (comma separated)" className="sm:col-span-6">
                <Input value={p.includesText} onChange={(e) => updatePkg(i, "includesText", e.target.value)} />
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
                  onClick={() => {
                    setDirty(true);
                    setPkgs((x) => x.filter((_, j) => j !== i));
                  }}
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
          setPkgs((x) => [...x, { key: key(), name: "", price: "", duration: "", summary: "", includesText: "", popular: false }])
        }
      >
        <Plus /> Add package
      </Button>
      <p className="text-xs text-muted">
        Removed packages that have bookings are hidden rather than deleted, so past bookings keep their details.
      </p>
    </div>
  );

  const extrasTab = (
    <Card className="overflow-hidden">
      <div className="divide-y divide-line">
        {extras.map((a, i) => (
          <div key={a.key} className="flex items-end gap-3 px-5 py-4">
            <Field label="Extra" className="flex-1">
              <Input value={a.name} maxLength={120} onChange={(e) => updateExtra(i, "name", e.target.value)} />
            </Field>
            <Field label="Price ($)" className="w-32">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={a.price}
                onChange={(e) => updateExtra(i, "price", e.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Remove"
              onClick={() => {
                setDirty(true);
                setExtras((x) => x.filter((_, j) => j !== i));
              }}
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
          onClick={() => setExtras((x) => [...x, { key: key(), name: "", price: "" }])}
        >
          <Plus /> Add extra
        </Button>
      </div>
    </Card>
  );

  const faqTab = (
    <div className="space-y-3">
      {s.faqs.map((f, i) => (
        <Card key={i} className="grid gap-3 p-5">
          <Field label="Question">
            <Input
              value={f.q}
              maxLength={255}
              onChange={(e) =>
                set(
                  "faqs",
                  s.faqs.map((v, j) => (j === i ? { ...v, q: e.target.value } : v)),
                )
              }
            />
          </Field>
          <Field label="Answer">
            <Textarea
              value={f.a}
              maxLength={2000}
              onChange={(e) =>
                set(
                  "faqs",
                  s.faqs.map((v, j) => (j === i ? { ...v, a: e.target.value } : v)),
                )
              }
            />
          </Field>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-danger"
            onClick={() =>
              set(
                "faqs",
                s.faqs.filter((_, j) => j !== i),
              )
            }
          >
            <Trash2 /> Remove
          </Button>
        </Card>
      ))}
      <Button type="button" variant="outline" onClick={() => set("faqs", [...s.faqs, { q: "", a: "" }])}>
        <Plus /> Add question
      </Button>
    </div>
  );

  const seoTab = (
    <Card className="grid gap-4 p-5">
      <Field
        label="Page title"
        htmlFor="sv-seo-title"
        hint={`${s.seoTitle.length}/60 characters recommended. Leave empty to use the service name.`}
      >
        <Input id="sv-seo-title" value={s.seoTitle} maxLength={160} onChange={(e) => set("seoTitle", e.target.value)} />
      </Field>
      <Field label="Meta description" htmlFor="sv-seo-desc" hint={`${s.seoDescription.length}/155 characters recommended.`}>
        <Textarea
          id="sv-seo-desc"
          value={s.seoDescription}
          maxLength={300}
          onChange={(e) => set("seoDescription", e.target.value)}
        />
      </Field>
    </Card>
  );

  return (
    <div>
      <Tabs
        tabs={[
          { id: "details", label: "Details", content: details },
          { id: "packages", label: `Packages (${pkgs.length})`, content: packagesTab },
          { id: "extras", label: `Extras (${extras.length})`, content: extrasTab },
          { id: "faqs", label: `FAQs (${s.faqs.length})`, content: faqTab },
          { id: "seo", label: "SEO", content: seoTab },
        ]}
      />
      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {error && <p className="mr-auto text-sm text-danger">{error}</p>}
        {!error && dirty && <p className="mr-auto text-sm text-muted">Unsaved changes</p>}
        {service && (
          <Button type="button" variant="ghost" disabled={pending || !dirty} onClick={() => window.location.reload()}>
            Discard changes
          </Button>
        )}
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save service"}
        </Button>
      </div>
      {toastNode}
    </div>
  );
}