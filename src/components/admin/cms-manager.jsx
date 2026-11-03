"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, GripVertical, Plus, Trash2 } from "lucide-react";
import { banners as seedBanners, blogPosts, cmsPages, faqs as seedFaqs } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Badge, Card, CardHeader, Table, Td, Th } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Switch, Tabs, useToast } from "@/components/ui/interactive";

const statusTone = { published: "success", draft: "brand", archived: "neutral" };

export function CmsManager() {
  const { toast, toastNode } = useToast();
  const [banners, setBanners] = useState(seedBanners);
  const [faqs, setFaqs] = useState(seedFaqs);
  const [sections, setSections] = useState([
    { id: "hero", label: "Hero with search", on: true },
    { id: "trust", label: "Trust strip", on: true },
    { id: "services", label: "Services grid", on: true },
    { id: "how", label: "How it works", on: true },
    { id: "compare", label: "One team comparison", on: true },
    { id: "reviews", label: "Reviews", on: true },
    { id: "areas", label: "Areas we cover", on: true },
    { id: "faq", label: "FAQ", on: true },
  ]);
  const move = (i, d) =>
    setSections((x) => {
      const y = [...x];
      const j = i + d;
      if (j < 0 || j >= y.length) return x;
      [y[i], y[j]] = [y[j], y[i]];
      return y;
    });

  const pagesTab = (
    <Card className="overflow-hidden">
      <CardHeader
        title="Pages"
        action={
          <ButtonLink href="/admin/cms/pages/new" size="sm">
            <Plus /> New page
          </ButtonLink>
        }
      />
      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>URL</Th>
            <Th>Status</Th>
            <Th>Updated</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {cmsPages.map((p) => (
            <tr key={p.id} className="hover:bg-paper/60">
              <Td>
                <Link href={`/admin/cms/pages/${p.id}`} className="font-semibold hover:underline">
                  {p.title}
                </Link>
              </Td>
              <Td className="text-muted">{p.slug}</Td>
              <Td>
                <Badge tone={statusTone[p.status]}>{p.status}</Badge>
              </Td>
              <Td>{formatDate(p.updated, { day: "numeric", month: "short", year: "numeric" })}</Td>
              <Td className="text-right">
                <Link href={p.slug} target="_blank" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                  <Eye className="size-4" /> View
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );

  const homeTab = (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader title="Hero" />
        <div className="grid gap-4 p-5">
          <Field label="Headline">
            <Textarea defaultValue={"Book the job.\nWe’ll handle the rest."} className="min-h-20" />
          </Field>
          <Field label="Supporting text">
            <Textarea defaultValue="Cleaning, pest control, gardening and repairs at fixed prices. Choose a time, and we send a vetted local pro — you only ever deal with us." />
          </Field>
          <Field label="Location line">
            <Input defaultValue="Greater Hobart, from Kingston to Brighton" />
          </Field>
          <Field label="Search button label">
            <Input defaultValue="See prices" />
          </Field>
          <Button className="w-fit" onClick={() => toast("Homepage saved")}>
            Save homepage
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Sections" description="Reorder or hide homepage sections." />
        <ul className="divide-y divide-line">
          {sections.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <GripVertical className="size-4 text-subtle" aria-hidden />
              <span className="flex-1">{s.label}</span>
              <button
                className="rounded px-1.5 text-muted hover:bg-paper"
                onClick={() => move(i, -1)}
                aria-label={`Move ${s.label} up`}
              >
                ↑
              </button>
              <button
                className="rounded px-1.5 text-muted hover:bg-paper"
                onClick={() => move(i, 1)}
                aria-label={`Move ${s.label} down`}
              >
                ↓
              </button>
              <Switch
                checked={s.on}
                onChange={(v) => setSections((x) => x.map((y) => (y.id === s.id ? { ...y, on: v } : y)))}
                label={`Show ${s.label}`}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );

  const bannersTab = (
    <div className="space-y-3">
      {banners.map((b, i) => (
        <Card key={b.id} className="grid gap-4 p-5 md:grid-cols-[1fr_200px_180px_auto] md:items-end">
          <Field label="Text">
            <Input
              value={b.text}
              onChange={(e) => setBanners((x) => x.map((y, j) => (j === i ? { ...y, text: e.target.value } : y)))}
            />
          </Field>
          <Field label="Link">
            <Input defaultValue={b.link} />
          </Field>
          <Field label="Placement">
            <Select defaultValue={b.placement}>
              <option>Top bar</option>
              <option>Home hero</option>
              <option>Service pages</option>
            </Select>
          </Field>
          <div className="flex h-11 items-center gap-3">
            <Switch defaultChecked={b.active} label="Banner active" />
            <button
              className="text-muted hover:text-danger"
              onClick={() => setBanners((x) => x.filter((_, j) => j !== i))}
              aria-label="Delete banner"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </Card>
      ))}
      <Button
        variant="outline"
        onClick={() =>
          setBanners((x) => [...x, { id: `bn-${x.length + 1}`, text: "", link: "/", placement: "Top bar", active: false }])
        }
      >
        <Plus /> Add banner
      </Button>
    </div>
  );

  const faqTab = (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <Card key={i} className="grid gap-3 p-5">
          <Field label="Question">
            <Input value={f.q} onChange={(e) => setFaqs((x) => x.map((y, j) => (j === i ? { ...y, q: e.target.value } : y)))} />
          </Field>
          <Field label="Answer">
            <Textarea
              value={f.a}
              onChange={(e) => setFaqs((x) => x.map((y, j) => (j === i ? { ...y, a: e.target.value } : y)))}
            />
          </Field>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setFaqs((x) => [...x, { q: "", a: "" }])}>
          <Plus /> Add question
        </Button>
        <Button onClick={() => toast("FAQs saved")}>Save FAQs</Button>
      </div>
    </div>
  );

  const blogTab = (
    <Card className="overflow-hidden">
      <CardHeader
        title="Home care guides"
        action={
          <ButtonLink href="/admin/cms/pages/new?type=post" size="sm">
            <Plus /> New post
          </ButtonLink>
        }
      />
      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>Category</Th>
            <Th>Status</Th>
            <Th>Date</Th>
          </tr>
        </thead>
        <tbody>
          {blogPosts.map((p) => (
            <tr key={p.slug} className="hover:bg-paper/60">
              <Td className="max-w-md whitespace-normal">
                <Link href={`/admin/cms/pages/${p.slug}?type=post`} className="font-semibold hover:underline">
                  {p.title}
                </Link>
              </Td>
              <Td>{p.category}</Td>
              <Td>
                <Badge tone={statusTone[p.status]}>{p.status}</Badge>
              </Td>
              <Td>{formatDate(p.date, { day: "numeric", month: "short", year: "numeric" })}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );

  return (
    <>
      <Tabs
        tabs={[
          { id: "pages", label: "Pages", content: pagesTab },
          { id: "home", label: "Homepage", content: homeTab },
          { id: "banners", label: "Banners", content: bannersTab },
          { id: "faqs", label: "FAQs", content: faqTab },
          { id: "blog", label: "Blog", content: blogTab },
        ]}
      />
      {toastNode}
    </>
  );
}
