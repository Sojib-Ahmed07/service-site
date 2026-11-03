"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Heading2, Image as ImageIcon, MousePointerClick, Pilcrow, Quote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/interactive";

const blockTypes = [
  { type: "heading", label: "Heading", icon: Heading2 },
  { type: "text", label: "Paragraph", icon: Pilcrow },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "cta", label: "Button", icon: MousePointerClick },
];

/**
 * A minimal block editor. Store `blocks` as JSONB on the page/post row and
 * render them on the site with a simple switch on block.type.
 */
export function ContentEditor({ doc, isPost }) {
  const [blocks, setBlocks] = useState(
    doc?.blocks ?? [
      { id: 1, type: "heading", text: doc?.title ?? "" },
      { id: 2, type: "text", text: doc?.excerpt ?? "" },
    ],
  );
  const { toast, toastNode } = useToast();
  const update = (id, patch) => setBlocks((x) => x.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const move = (i, d) =>
    setBlocks((x) => {
      const y = [...x];
      const j = i + d;
      if (j < 0 || j >= y.length) return x;
      [y[i], y[j]] = [y[j], y[i]];
      return y;
    });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <Card className="p-5">
          <Input
            defaultValue={doc?.title}
            placeholder="Title"
            className="h-14 border-0 px-0 font-display text-3xl font-semibold focus:ring-0"
            aria-label="Title"
          />
        </Card>
        {blocks.map((b, i) => (
          <Card key={b.id} className="group p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>{blockTypes.find((t) => t.type === b.type)?.label}</span>
              <span className="flex gap-1 opacity-60 group-hover:opacity-100">
                <button onClick={() => move(i, -1)} aria-label="Move up" className="rounded p-1 hover:bg-paper">
                  <ArrowUp className="size-3.5" />
                </button>
                <button onClick={() => move(i, 1)} aria-label="Move down" className="rounded p-1 hover:bg-paper">
                  <ArrowDown className="size-3.5" />
                </button>
                <button
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
                value={b.text}
                onChange={(e) => update(b.id, { text: e.target.value })}
                className="font-display text-xl font-semibold"
                placeholder="Heading"
              />
            )}
            {b.type === "text" && (
              <Textarea value={b.text} onChange={(e) => update(b.id, { text: e.target.value })} placeholder="Write something…" />
            )}
            {b.type === "quote" && (
              <Textarea
                value={b.text}
                onChange={(e) => update(b.id, { text: e.target.value })}
                className="italic"
                placeholder="Quote"
              />
            )}
            {b.type === "image" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="file" accept="image/*" className="py-2" aria-label="Image file" />
                <Input
                  value={b.alt ?? ""}
                  onChange={(e) => update(b.id, { alt: e.target.value })}
                  placeholder="Alt text (describe the image)"
                />
              </div>
            )}
            {b.type === "cta" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={b.text ?? ""} onChange={(e) => update(b.id, { text: e.target.value })} placeholder="Button label" />
                <Input value={b.href ?? ""} onChange={(e) => update(b.id, { href: e.target.value })} placeholder="/services" />
              </div>
            )}
          </Card>
        ))}
        <div className="flex flex-wrap gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-line-strong p-3">
          <span className="self-center px-1 text-sm text-muted">Add block:</span>
          {blockTypes.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => setBlocks((x) => [...x, { id: Date.now(), type, text: "" }])}
            >
              <Icon /> {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Publish" />
          <div className="space-y-4 p-5">
            <Field label="Status">
              <Select defaultValue={doc?.status ?? "draft"}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="URL">
              <Input defaultValue={doc?.slug ?? ""} placeholder={isPost ? "my-post" : "/my-page"} />
            </Field>
            {isPost && (
              <Field label="Category">
                <Input defaultValue={doc?.category} />
              </Field>
            )}
            <div className="flex gap-2">
              <Button onClick={() => toast("Saved")}>Save</Button>
              <Button variant="outline" onClick={() => toast("Preview opened")}>
                Preview
              </Button>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="SEO" />
          <div className="space-y-4 p-5">
            <Field label="Meta title">
              <Input defaultValue={doc?.title} />
            </Field>
            <Field label="Meta description">
              <Textarea defaultValue={doc?.excerpt} />
            </Field>
          </div>
        </Card>
      </div>
      {toastNode}
    </div>
  );
}
