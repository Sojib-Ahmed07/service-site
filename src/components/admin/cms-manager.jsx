// src/components/admin/cms-manager.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteBanner, deleteFaq, moveFaq, saveBanner, saveFaq, saveHomepage } from "@/server/actions/admin-content";
import { bannerPlacements, contentVariables, homeSections } from "@/lib/cms";
import { formatDate } from "@/lib/utils";
import { Badge, Card, CardHeader, EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal, Switch, Tabs, useToast } from "@/components/ui/interactive";
import { ImageInput } from "@/components/ui/upload";

const statusTone = { published: "success", draft: "brand", archived: "neutral" };
const day = (iso) => (iso ? formatDate(iso, { day: "numeric", month: "short", year: "numeric" }) : "—");
/** Hobart calendar date (YYYY-MM-DD) of an instant, for date inputs. */
const hobartDate = (iso) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Hobart" }).format(new Date(iso)) : "");

/** Lists the {variables} admins can type into content. */
export function VariablesHint() {
  return (
    <details className="rounded-[var(--radius-card)] border border-line bg-paper/60 px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">Live values you can use in text</summary>
      <p className="mt-2 text-muted">Type these in braces and they’re replaced with the current value from Settings:</p>
      <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {contentVariables.map(([key, label]) => (
          <li key={key}>
            <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs ring-1 ring-line">{`{${key}}`}</code>{" "}
            <span className="text-muted">{label}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Admin › Content. Props come from the server:
 * pages, posts, banners, faqs, homepage (settings), images (settings).
 */
export function CmsManager({ defaultTab = "pages", pages, posts, banners, faqs, homepage, images }) {
  const { toast, toastNode } = useToast();
  // The homepage editor's state lives here so switching tabs doesn't lose unsaved edits.
  const [home, setHome] = useState(() => ({
    ...homepage,
    images: {
      hero: images.hero ?? "",
      cleaner: images.cleaner ?? "",
      kitchen: images.kitchen ?? "",
      livingRoom: images.livingRoom ?? "",
    },
  }));

  return (
    <>
      <Tabs
        defaultTab={defaultTab}
        tabs={[
          { id: "pages", label: "Pages", content: <PagesTab pages={pages} /> },
          { id: "home", label: "Homepage", content: <HomepageTab home={home} setHome={setHome} toast={toast} /> },
          { id: "banners", label: "Banners", content: <BannersTab banners={banners} toast={toast} /> },
          { id: "faqs", label: "FAQs", content: <FaqsTab faqs={faqs} toast={toast} /> },
          { id: "blog", label: "Blog", content: <BlogTab posts={posts} /> },
        ]}
      />
      {toastNode}
    </>
  );
}

/* Pages --------------------------------------------------------------------- */

function PagesTab({ pages }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Pages"
        description="Built-in pages are always live; you can edit their wording. New pages get their own URL."
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
          <tr className="hover:bg-paper/60">
            <Td>
              <span className="font-semibold">Home</span>
            </Td>
            <Td className="text-muted">/</Td>
            <Td>
              <Badge tone="success">published</Badge>
            </Td>
            <Td className="text-muted">Homepage tab</Td>
            <Td className="text-right">
              <Link href="/" target="_blank" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                <Eye className="size-4" /> View
              </Link>
            </Td>
          </tr>
          {pages.map((p) => {
            const key = p.id ?? p.slug.slice(1);
            return (
              <tr key={p.slug} className="hover:bg-paper/60">
                <Td>
                  <Link href={`/admin/cms/pages/${key}`} className="font-semibold hover:underline">
                    {p.title}
                  </Link>
                  {p.builtIn && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted">
                      <Lock className="size-3" /> Built-in
                    </span>
                  )}
                </Td>
                <Td className="text-muted">{p.slug}</Td>
                <Td>
                  <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                </Td>
                <Td>{day(p.updatedAt)}</Td>
                <Td className="text-right">
                  {p.status === "published" && (
                    <Link
                      href={p.slug}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
                    >
                      <Eye className="size-4" /> View
                    </Link>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

/* Homepage ------------------------------------------------------------------ */

function HomepageTab({ home, setHome, toast }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const set = (k) => (e) => setHome((h) => ({ ...h, [k]: e.target.value }));
  const setImage = (k) => (v) => setHome((h) => ({ ...h, images: { ...h.images, [k]: v } }));
  const setStep = (i, k, v) => setHome((h) => ({ ...h, steps: h.steps.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const setPoint = (i, v) => setHome((h) => ({ ...h, teamPoints: h.teamPoints.map((p, j) => (j === i ? v : p)) }));
  const moveSection = (i, d) =>
    setHome((h) => {
      const s = [...h.sections];
      const j = i + d;
      if (j < 0 || j >= s.length) return h;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...h, sections: s };
    });

  const save = () =>
    start(async () => {
      setError("");
      const res = await saveHomepage({
        heroTitle: home.heroTitle,
        heroText: home.heroText,
        heroBadge: home.heroBadge,
        popularTitle: home.popularTitle,
        popularText: home.popularText,
        howTitle: home.howTitle,
        howText: home.howText,
        steps: home.steps,
        teamTitle: home.teamTitle,
        teamText: home.teamText,
        teamPoints: home.teamPoints,
        reviewsTitle: home.reviewsTitle,
        reviewsText: home.reviewsText,
        areasText: home.areasText,
        faqTitle: home.faqTitle,
        ctaTitle: home.ctaTitle,
        ctaText: home.ctaText,
        sections: home.sections.map((s) => ({ id: s.id, visible: s.visible })),
        images: home.images,
      });
      if (!res.ok) return setError(res.error);
      toast("Homepage saved");
      router.refresh();
    });

  const label = (id) => homeSections.find((s) => s.id === id)?.label ?? id;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader title="Hero" description="The first thing visitors see." />
          <div className="grid gap-4 p-5">
            <Field label="Headline">
              <Input value={home.heroTitle} onChange={set("heroTitle")} maxLength={120} />
            </Field>
            <Field label="Supporting text">
              <Textarea value={home.heroText} onChange={set("heroText")} maxLength={300} />
            </Field>
            <Field label="Badge on the photo" hint="Shown as “Every pro is …”. Leave empty to hide.">
              <Input value={home.heroBadge} onChange={set("heroBadge")} maxLength={60} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Most booked" description="Shows services marked “Popular” in Services." />
          <div className="grid gap-4 p-5">
            <Field label="Heading">
              <Input value={home.popularTitle} onChange={set("popularTitle")} maxLength={120} />
            </Field>
            <Field label="Text">
              <Input value={home.popularText} onChange={set("popularText")} maxLength={300} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="How it works" description="These steps also appear on the How it works page." />
          <div className="grid gap-4 p-5">
            <Field label="Heading">
              <Input value={home.howTitle} onChange={set("howTitle")} maxLength={120} />
            </Field>
            <Field label="Text">
              <Textarea value={home.howText} onChange={set("howText")} maxLength={300} />
            </Field>
            {home.steps.map((s, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Step {i + 1}</p>
                  {home.steps.length > 2 && (
                    <button
                      type="button"
                      className="rounded p-1 text-muted hover:bg-danger-50 hover:text-danger"
                      aria-label={`Remove step ${i + 1}`}
                      onClick={() => setHome((h) => ({ ...h, steps: h.steps.filter((_, j) => j !== i) }))}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <Input value={s.title} onChange={(e) => setStep(i, "title", e.target.value)} placeholder="Title" maxLength={80} />
                <Textarea value={s.body} onChange={(e) => setStep(i, "body", e.target.value)} placeholder="Text" maxLength={300} />
              </div>
            ))}
            {home.steps.length < 4 && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setHome((h) => ({ ...h, steps: [...h.steps, { title: "", body: "" }] }))}
              >
                <Plus /> Add step
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="One team" />
          <div className="grid gap-4 p-5">
            <Field label="Heading">
              <Input value={home.teamTitle} onChange={set("teamTitle")} maxLength={120} />
            </Field>
            <Field label="Text">
              <Textarea value={home.teamText} onChange={set("teamText")} maxLength={400} />
            </Field>
            <Field label="Ticked points">
              <div className="grid gap-2">
                {home.teamPoints.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={p} onChange={(e) => setPoint(i, e.target.value)} maxLength={80} aria-label={`Point ${i + 1}`} />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove point ${i + 1}`}
                      onClick={() => setHome((h) => ({ ...h, teamPoints: h.teamPoints.filter((_, j) => j !== i) }))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {home.teamPoints.length < 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => setHome((h) => ({ ...h, teamPoints: [...h.teamPoints, ""] }))}
                  >
                    <Plus /> Add point
                  </Button>
                )}
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Other sections" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Reviews heading">
              <Input value={home.reviewsTitle} onChange={set("reviewsTitle")} maxLength={120} />
            </Field>
            <Field label="Reviews text">
              <Input value={home.reviewsText} onChange={set("reviewsText")} maxLength={300} />
            </Field>
            <Field label="Areas text" hint="After “N zones across your region.”" className="sm:col-span-2">
              <Input value={home.areasText} onChange={set("areasText")} maxLength={300} />
            </Field>
            <Field label="Questions heading">
              <Input value={home.faqTitle} onChange={set("faqTitle")} maxLength={120} />
            </Field>
            <div className="hidden sm:block" />
            <Field label="Closing banner heading" hint="The dark banner at the bottom of most pages.">
              <Input value={home.ctaTitle} onChange={set("ctaTitle")} maxLength={120} />
            </Field>
            <Field label="Closing banner text">
              <Input value={home.ctaText} onChange={set("ctaText")} maxLength={300} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Photos"
            description="Upload a photo, or use an Unsplash photo id (photo-…) or a full https:// image address. Leave empty to keep the current photo."
          />
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            {[
              ["hero", "Homepage hero"],
              ["cleaner", "“One team” section"],
              ["kitchen", "Closing banner"],
              ["livingRoom", "Login and sign-up pages"],
            ].map(([k, l]) => (
              <Field key={k} label={l}>
                <ImageInput value={home.images[k] ?? ""} onChange={setImage(k)} label={l} />
              </Field>
            ))}
          </div>
        </Card>
        <VariablesHint />
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader title="Sections" description="Reorder or hide. The hero and closing banner always show." />
          <ul className="divide-y divide-line">
            {home.sections.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                <span className={s.visible ? "flex-1" : "flex-1 text-muted line-through"}>{label(s.id)}</span>
                <button
                  type="button"
                  className="rounded p-1 text-muted hover:bg-paper disabled:opacity-30"
                  onClick={() => moveSection(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${label(s.id)} up`}
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-muted hover:bg-paper disabled:opacity-30"
                  onClick={() => moveSection(i, 1)}
                  disabled={i === home.sections.length - 1}
                  aria-label={`Move ${label(s.id)} down`}
                >
                  <ArrowDown className="size-4" />
                </button>
                <Switch
                  checked={s.visible}
                  onChange={(v) =>
                    setHome((h) => ({ ...h, sections: h.sections.map((x) => (x.id === s.id ? { ...x, visible: v } : x)) }))
                  }
                  label={`Show ${label(s.id)}`}
                />
              </li>
            ))}
          </ul>
        </Card>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save homepage"}
          </Button>
          <ButtonLink href="/" target="_blank" variant="outline">
            <Eye /> View
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

/* Banners ------------------------------------------------------------------- */

function bannerState(b) {
  const now = Date.now();
  if (!b.active) return ["Off", "neutral"];
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return ["Scheduled", "brand"];
  if (b.endsAt && new Date(b.endsAt).getTime() <= now) return ["Ended", "neutral"];
  return ["Live", "success"];
}

function BannersTab({ banners, toast }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const open = (b) => {
    setError("");
    setForm(
      b
        ? {
          id: b.id,
          text: b.text,
          link: b.link,
          placement: b.placement,
          active: b.active,
          startsOn: hobartDate(b.startsAt),
          endsOn: hobartDate(b.endsAt),
        }
        : { text: "", link: "/", placement: bannerPlacements[0], active: true, startsOn: "", endsOn: "" },
    );
  };
  const save = () =>
    start(async () => {
      const res = await saveBanner(form);
      if (!res.ok) return setError(res.error);
      setForm(null);
      toast("Banner saved");
      router.refresh();
    });
  const remove = () =>
    start(async () => {
      const res = await deleteBanner(confirm.id);
      if (!res.ok) return toast(res.error);
      setConfirm(null);
      toast("Banner deleted");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        One banner shows per place at a time — the newest live one. Use dates to schedule a promotion.
      </p>
      <Card className="overflow-hidden">
        <CardHeader
          title="Banners"
          action={
            <Button size="sm" onClick={() => open(null)}>
              <Plus /> Add banner
            </Button>
          }
        />
        {banners.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No banners" body="Add one to promote an offer across the site." />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Text</Th>
                <Th>Where</Th>
                <Th>Dates</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => {
                const [state, tone] = bannerState(b);
                return (
                  <tr key={b.id} className="hover:bg-paper/60">
                    <Td className="max-w-sm whitespace-normal">
                      <p className="font-medium">{b.text}</p>
                      {b.link && <p className="text-xs text-muted">{b.link}</p>}
                    </Td>
                    <Td>{b.placement}</Td>
                    <Td className="text-sm text-muted">
                      {b.startsAt || b.endsAt ? `${day(b.startsAt)} – ${day(b.endsAt)}` : "Always"}
                    </Td>
                    <Td>
                      <Badge tone={tone}>{state}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => open(b)} aria-label="Edit banner">
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirm(b)} aria-label="Delete banner">
                          <Trash2 />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit banner" : "Add banner"}
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save banner"}
            </Button>
          </>
        }
      >
        {form && (
          <div className="grid gap-4">
            <Field label="Text">
              <Input value={form.text} onChange={set("text")} maxLength={200} autoFocus />
            </Field>
            <Field label="Link" hint="A page on this site (/services/pest-control) or https://…">
              <Input value={form.link} onChange={set("link")} maxLength={255} />
            </Field>
            <Field label="Where it shows">
              <Select value={form.placement} onChange={set("placement")}>
                {bannerPlacements.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" hint="Optional">
                <Input type="date" value={form.startsOn} onChange={set("startsOn")} />
              </Field>
              <Field label="Ends" hint="Optional — shows until the end of that day">
                <Input type="date" value={form.endsOn} onChange={set("endsOn")} />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm font-medium">
              <Switch checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Banner on" />
              Banner on
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Delete this banner?"
        description={confirm?.text}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={remove} disabled={pending}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}

/* FAQs ---------------------------------------------------------------------- */

function FaqsTab({ faqs, toast }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const groups = [
    ["general", "Bookings", "Shown on the homepage and in the help centre."],
    ["payments", "Payments", "Shown in the help centre."],
  ];

  const save = () =>
    start(async () => {
      const res = await saveFaq(form);
      if (!res.ok) return setError(res.error);
      setForm(null);
      toast("Question saved");
      router.refresh();
    });
  const move = (id, d) =>
    start(async () => {
      const res = await moveFaq(id, d);
      if (!res.ok) return toast(res.error);
      router.refresh();
    });
  const remove = () =>
    start(async () => {
      const res = await deleteFaq(confirm.id);
      if (!res.ok) return toast(res.error);
      setConfirm(null);
      toast("Question deleted");
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Questions about a single service are edited on that service in Services.</p>
      {groups.map(([section, title, description]) => {
        const list = faqs.filter((f) => f.section === section);
        return (
          <Card key={section} className="overflow-hidden">
            <CardHeader
              title={title}
              description={description}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setError("");
                    setForm({ question: "", answer: "", section });
                  }}
                >
                  <Plus /> Add question
                </Button>
              }
            />
            {list.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">No questions yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {list.map((f, i) => (
                  <li key={f.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{f.question}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted">{f.answer}</p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending || i === 0}
                        onClick={() => move(f.id, -1)}
                        aria-label="Move up"
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending || i === list.length - 1}
                        onClick={() => move(f.id, 1)}
                        aria-label="Move down"
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setError("");
                          setForm({ id: f.id, question: f.question, answer: f.answer, section: f.section });
                        }}
                        aria-label="Edit question"
                      >
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirm(f)} aria-label="Delete question">
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
      <VariablesHint />

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit question" : "Add question"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save question"}
            </Button>
          </>
        }
      >
        {form && (
          <div className="grid gap-4">
            <Field label="Question">
              <Input value={form.question} onChange={set("question")} maxLength={255} autoFocus />
            </Field>
            <Field label="Answer">
              <Textarea value={form.answer} onChange={set("answer")} maxLength={3000} className="min-h-36" />
            </Field>
            <Field label="Section">
              <Select value={form.section} onChange={set("section")}>
                {groups.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Delete this question?"
        description={confirm?.question}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={remove} disabled={pending}>
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}

/* Blog ---------------------------------------------------------------------- */

function postState(p) {
  if (p.status !== "published") return [p.status, statusTone[p.status]];
  if (p.publishedAt && new Date(p.publishedAt).getTime() > Date.now()) return ["scheduled", "brand"];
  return ["published", "success"];
}

function BlogTab({ posts }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Home care guides"
        action={
          <ButtonLink href="/admin/cms/pages/new?type=post" size="sm">
            <Plus /> New post
          </ButtonLink>
        }
      />
      {posts.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No posts yet" body="Write your first guide." />
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Published</Th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => {
              const [state, tone] = postState(p);
              return (
                <tr key={p.id} className="hover:bg-paper/60">
                  <Td className="max-w-md whitespace-normal">
                    <Link href={`/admin/cms/pages/${p.id}?type=post`} className="font-semibold hover:underline">
                      {p.title}
                    </Link>
                  </Td>
                  <Td>{p.category || "—"}</Td>
                  <Td>
                    <Badge tone={tone}>{state}</Badge>
                  </Td>
                  <Td>{day(p.publishedAt)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}