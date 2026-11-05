// src/components/admin/content-editor.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Heading2,
  Image as ImageIcon,
  LayoutGrid,
  Lock,
  MousePointerClick,
  Pilcrow,
  Plus,
  Quote,
  Trash2,
} from "lucide-react";
import { deletePage, deletePost, savePage, savePost } from "@/server/actions/admin-content";
import { slugify } from "@/lib/cms";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal, useToast } from "@/components/ui/interactive";
import { Photo } from "@/components/ui/photo";
import { VariablesHint } from "@/components/admin/cms-manager";

const blockTypes = [
  { type: "heading", label: "Heading", icon: Heading2 },
  { type: "text", label: "Paragraph", icon: Pilcrow },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "cta", label: "Button", icon: MousePointerClick },
  { type: "cards", label: "Cards", icon: LayoutGrid },
];

const newBlock = (type) => {
  const id = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  if (type === "image") return { id, type, src: "", alt: "" };
  if (type === "cta") return { id, type, text: "", href: "" };
  if (type === "cards") return { id, type, style: "ticks", items: [{ title: "", body: "" }] };
  return { id, type, text: "" };
};

/** Hobart calendar date (YYYY-MM-DD) of an instant, for date inputs. */
const hobartDate = (iso) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Hobart" }).format(new Date(iso)) : "");

/** Strips editor-only fields so only what the site needs is saved. */
function forSave(b) {
  switch (b.type) {
    case "image":
      return { id: b.id, type: b.type, src: (b.src ?? "").trim(), alt: b.alt ?? "" };
    case "cta":
      return { id: b.id, type: b.type, text: b.text ?? "", href: (b.href ?? "").trim() };
    case "cards":
      return {
        id: b.id,
        type: b.type,
        style: b.style === "numbered" ? "numbered" : "ticks",
        items: (b.items ?? []).map((i) => ({ title: i.title ?? "", body: i.body ?? "" })),
      };
    default:
      return { id: b.id, type: b.type, text: b.text ?? "" };
  }
}

/**
 * Block editor for pages and blog posts. Blocks are saved as JSON on the row and
 * rendered on the site by components/site/blocks.jsx.
 * `doc` comes from getPageForEdit / getPostForEdit; `services` ([{ slug, name }]) and
 * `offers` are only passed for the /offers page; `categories` are existing post categories.
 */
export function ContentEditor({ doc, isPost, services = [], offers = null, categories = [] }) {
  const router = useRouter();
  const { toast, toastNode } = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const builtIn = Boolean(doc.builtIn);
  const isNew = !doc.id && !builtIn;

  const [title, setTitle] = useState(doc.title ?? "");
  const [intro, setIntro] = useState(doc.intro ?? "");
  const [slug, setSlug] = useState(isPost ? (doc.slug ?? "") : (doc.slug ?? "").replace(/^\//, ""));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [status, setStatus] = useState(doc.status ?? "draft");
  const [seoTitle, setSeoTitle] = useState(doc.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(doc.seoDescription ?? "");
  const [excerpt, setExcerpt] = useState(doc.excerpt ?? "");
  const [category, setCategory] = useState(doc.category ?? "");
  const [coverImage, setCoverImage] = useState(doc.coverImage ?? "");
  const [publishOn, setPublishOn] = useState(hobartDate(doc.publishedAt));
  const [blocks, setBlocks] = useState(doc.blocks ?? []);
  const [seasonal, setSeasonal] = useState(offers?.seasonal ?? []);
  const [seasonalTitle, setSeasonalTitle] = useState(offers?.seasonalTitle ?? "");
  const [seasonalText, setSeasonalText] = useState(offers?.seasonalText ?? "");

  const update = (id, patch) => setBlocks((x) => x.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const updateItem = (id, i, patch) =>
    setBlocks((x) =>
      x.map((b) => (b.id === id ? { ...b, items: b.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) } : b)),
    );
  const move = (i, d) =>
    setBlocks((x) => {
      const y = [...x];
      const j = i + d;
      if (j < 0 || j >= y.length) return x;
      [y[i], y[j]] = [y[j], y[i]];
      return y;
    });

  const onTitle = (v) => {
    setTitle(v);
    if (!slugTouched && !builtIn) setSlug(slugify(v));
  };

  const publicUrl = isPost ? `/blog/${slug}` : builtIn ? doc.slug : `/${slug}`;
  const canView = isPost ? doc.id && doc.status === "published" : builtIn || (doc.id && doc.status === "published");

  const save = () =>
    start(async () => {
      setError("");
      const res = isPost
        ? await savePost({
          id: doc.id ?? null,
          title,
          slug,
          excerpt,
          category,
          coverImage: coverImage.trim(),
          blocks: blocks.map(forSave),
          status,
          publishOn,
        })
        : await savePage({
          id: doc.id ?? null,
          builtInSlug: builtIn ? doc.slug : null,
          title,
          intro,
          slug,
          blocks: blocks.map(forSave),
          seoTitle,
          seoDescription,
          status,
          ...(offers ? { offers: { seasonal, seasonalTitle, seasonalText } } : {}),
        });
      if (!res.ok) return setError(res.error);
      toast("Saved");
      if (!isPost && res.slug) setSlug(res.slug.replace(/^\//, ""));
      if (isPost && res.slug) setSlug(res.slug);
      if (!doc.id) {
        router.replace(`/admin/cms/pages/${res.id}${isPost ? "?type=post" : ""}`);
      }
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const res = isPost ? await deletePost(doc.id) : await deletePage(doc.id);
      if (!res.ok) {
        setConfirmDelete(false);
        return setError(res.error);
      }
      router.push(`/admin/cms${isPost ? "?tab=blog" : ""}`);
      router.refresh();
    });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-3">
        <Card className="space-y-3 p-5">
          <Input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="Title"
            maxLength={isPost ? 200 : 160}
            className="h-14 border-0 px-0 font-display text-2xl font-semibold focus:ring-0 sm:text-3xl"
            aria-label="Title"
          />
          {isPost ? (
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Summary — shown under the title, on the blog list and in search results"
              maxLength={300}
              aria-label="Summary"
            />
          ) : (
            <Textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="Intro text under the title"
              maxLength={400}
              aria-label="Intro"
            />
          )}
        </Card>

        {blocks.length === 0 && (
          <p className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-6 text-center text-sm text-muted">
            {builtIn ? "This page has no extra content blocks. Add some below if you like." : "Add your first block below."}
          </p>
        )}

        {blocks.map((b, i) => (
          <Card key={b.id} className="group p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>{blockTypes.find((t) => t.type === b.type)?.label ?? b.type}</span>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move block up"
                  className="rounded p-1 hover:bg-paper disabled:opacity-30"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === blocks.length - 1}
                  aria-label="Move block down"
                  className="rounded p-1 hover:bg-paper disabled:opacity-30"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setBlocks((x) => x.filter((y) => y.id !== b.id))}
                  aria-label="Delete block"
                  className="rounded p-1 hover:bg-danger-50 hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </div>
            {b.type === "heading" && (
              <Input
                value={b.text ?? ""}
                onChange={(e) => update(b.id, { text: e.target.value })}
                className="font-display text-xl font-semibold"
                placeholder="Heading"
                maxLength={200}
                aria-label="Heading"
              />
            )}
            {b.type === "text" && (
              <Textarea
                value={b.text ?? ""}
                onChange={(e) => update(b.id, { text: e.target.value })}
                placeholder="Write something…"
                maxLength={5000}
                className="min-h-28"
                aria-label="Paragraph"
              />
            )}
            {b.type === "quote" && (
              <Textarea
                value={b.text ?? ""}
                onChange={(e) => update(b.id, { text: e.target.value })}
                className="italic"
                placeholder="Quote"
                maxLength={1000}
                aria-label="Quote"
              />
            )}
            {b.type === "image" && (
              <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <Photo src={b.src} alt="" sizes={400} className="aspect-[16/9] rounded-lg" />
                <div className="grid gap-2">
                  <Input
                    value={b.src ?? ""}
                    onChange={(e) => update(b.id, { src: e.target.value })}
                    placeholder="Unsplash id (photo-…) or https://… image address"
                    maxLength={500}
                    aria-label="Image address"
                  />
                  <Input
                    value={b.alt ?? ""}
                    onChange={(e) => update(b.id, { alt: e.target.value })}
                    placeholder="Alt text (describe the image)"
                    maxLength={200}
                    aria-label="Alt text"
                  />
                </div>
              </div>
            )}
            {b.type === "cta" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={b.text ?? ""}
                  onChange={(e) => update(b.id, { text: e.target.value })}
                  placeholder="Button label"
                  maxLength={60}
                  aria-label="Button label"
                />
                <Input
                  value={b.href ?? ""}
                  onChange={(e) => update(b.id, { href: e.target.value })}
                  placeholder="/services"
                  maxLength={255}
                  aria-label="Button link"
                />
              </div>
            )}
            {b.type === "cards" && (
              <div className="grid gap-3">
                <Select
                  value={b.style}
                  onChange={(e) => update(b.id, { style: e.target.value })}
                  className="w-full sm:w-56"
                  aria-label="Card style"
                >
                  <option value="ticks">Cards with ticks</option>
                  <option value="numbered">Numbered steps</option>
                </Select>
                {b.items.map((it, j) => (
                  <div key={j} className="grid gap-2 rounded-xl border border-line p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={it.title}
                        onChange={(e) => updateItem(b.id, j, { title: e.target.value })}
                        placeholder={`Card ${j + 1} title`}
                        maxLength={120}
                        aria-label={`Card ${j + 1} title`}
                      />
                      <button
                        type="button"
                        onClick={() => update(b.id, { items: b.items.filter((_, k) => k !== j) })}
                        aria-label={`Remove card ${j + 1}`}
                        className="rounded p-1.5 text-muted hover:bg-danger-50 hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <Textarea
                      value={it.body}
                      onChange={(e) => updateItem(b.id, j, { body: e.target.value })}
                      placeholder="Text"
                      maxLength={600}
                      aria-label={`Card ${j + 1} text`}
                    />
                  </div>
                ))}
                {b.items.length < 12 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => update(b.id, { items: [...b.items, { title: "", body: "" }] })}
                  >
                    <Plus /> Add card
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}

        <div className="flex flex-wrap gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-line-strong p-3">
          <span className="self-center px-1 text-sm text-muted">Add block:</span>
          {blockTypes.map(({ type, label, icon: Icon }) => (
            <Button key={type} variant="outline" size="sm" onClick={() => setBlocks((x) => [...x, newBlock(type)])}>
              <Icon /> {label}
            </Button>
          ))}
        </div>
        <VariablesHint />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Publish" />
          <div className="space-y-4 p-5">
            {builtIn ? (
              <p className="flex items-start gap-2 text-sm text-muted">
                <Lock className="mt-0.5 size-4 shrink-0" />
                Built-in page at {doc.slug}. It’s always live and its URL can’t change.
              </p>
            ) : (
              <>
                <Field label="Status">
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </Select>
                </Field>
                <Field label="URL" hint={isPost ? `/blog/${slug || "…"}` : `/${slug || "…"}`}>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    onBlur={() => setSlug((s) => slugify(s))}
                    placeholder={isPost ? "my-post" : "my-page"}
                    maxLength={80}
                  />
                </Field>
              </>
            )}
            {isPost && (
              <>
                <Field label="Publish date" hint="Leave empty to publish now. A future date schedules the post.">
                  <Input type="date" value={publishOn} onChange={(e) => setPublishOn(e.target.value)} />
                </Field>
                <Field label="Category">
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} list="post-categories" maxLength={60} />
                  <datalist id="post-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Cover image" hint="Unsplash id (photo-…) or https://… image address">
                  <div className="grid gap-2">
                    {coverImage && <Photo src={coverImage.trim()} alt="" sizes={400} className="aspect-[16/9] rounded-lg" />}
                    <Input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} maxLength={500} />
                  </div>
                </Field>
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
              {canView && (
                <ButtonLink href={publicUrl} target="_blank" variant="outline">
                  <Eye /> View
                </ButtonLink>
              )}
              {doc.id && !builtIn && (
                <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-danger">
                  <Trash2 /> Delete
                </Button>
              )}
            </div>
          </div>
        </Card>

        {offers && (
          <Card>
            <CardHeader title="In season now" description="Services shown under the codes on the Offers page." />
            <div className="space-y-4 p-5">
              <Field label="Heading">
                <Input value={seasonalTitle} onChange={(e) => setSeasonalTitle(e.target.value)} maxLength={120} />
              </Field>
              <Field label="Text">
                <Textarea value={seasonalText} onChange={(e) => setSeasonalText(e.target.value)} maxLength={300} />
              </Field>
              <div className="grid gap-2">
                {services.map((s) => (
                  <Checkbox
                    key={s.slug}
                    label={s.name}
                    checked={seasonal.includes(s.slug)}
                    onChange={(e) =>
                      setSeasonal((x) => (e.target.checked ? [...x, s.slug] : x.filter((y) => y !== s.slug)))
                    }
                  />
                ))}
              </div>
            </div>
          </Card>
        )}

        {!isPost && (
          <Card>
            <CardHeader title="SEO" description="Leave empty to use the title and intro." />
            <div className="space-y-4 p-5">
              <Field label="Meta title">
                <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={160} />
              </Field>
              <Field label="Meta description">
                <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={300} />
              </Field>
            </div>
          </Card>
        )}
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete this ${isPost ? "post" : "page"}?`}
        description="This can’t be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={remove} disabled={pending}>
              Delete
            </Button>
          </>
        }
      />
      {toastNode}
    </div>
  );
}