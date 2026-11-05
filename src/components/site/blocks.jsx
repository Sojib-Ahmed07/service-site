// src/components/site/blocks.jsx
/**
 * Renders content blocks saved by the admin ContentEditor (pages and blog posts).
 * Block shapes: { type: "heading" | "text" | "image" | "quote" | "cta" | "cards", text, src?, alt?, href? }
 * Cards: { type: "cards", style: "numbered" | "ticks", items: [{ title, body }] }
 * {Variables} are already filled in by the query (server/queries/content.js).
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";

function cardCols(n, wide) {
    if (!wide) return "sm:grid-cols-2";
    if (n >= 4) return "sm:grid-cols-2 lg:grid-cols-4";
    if (n === 3) return "md:grid-cols-3";
    return "sm:grid-cols-2";
}

function Cards({ block, wide }) {
    const items = block.items ?? [];
    if (!items.length) return null;
    const numbered = block.style === "numbered";
    const List = numbered ? "ol" : "ul";
    return (
        <List className={cn("grid gap-4 text-base", cardCols(items.length, wide))}>
            {items.map((it, i) => (
                <li key={i} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
                    {numbered ? (
                        <span className="font-display text-4xl font-semibold text-ink-300">{i + 1}</span>
                    ) : (
                        <span className="grid size-10 place-items-center rounded-full bg-ink-50 text-ink-900">
                            <Check className="size-5" strokeWidth={2.5} />
                        </span>
                    )}
                    {it.title && <p className="mt-4 text-lg font-semibold leading-snug">{it.title}</p>}
                    {it.body && <p className="mt-2 leading-relaxed text-muted">{it.body}</p>}
                </li>
            ))}
        </List>
    );
}

/**
 * `wide`: card blocks use the full width (up to 4 columns) while text stays at a
 * comfortable reading width.
 */
export function Blocks({ blocks = [], className = "space-y-6 text-lg leading-[1.75]", wide = false }) {
    if (!blocks.length) return null;
    const narrow = wide ? "max-w-3xl" : "";
    return (
        <div className={className}>
            {blocks.map((b, i) => {
                const key = b.id ?? i;
                switch (b.type) {
                    case "heading":
                        return b.text ? (
                            <h2 key={key} className={cn("pt-4 text-2xl font-semibold leading-tight", narrow)}>
                                {b.text}
                            </h2>
                        ) : null;
                    case "image":
                        return b.src ? (
                            <Photo
                                key={key}
                                src={b.src}
                                alt={b.alt ?? ""}
                                sizes={1200}
                                className={cn("aspect-[16/9] rounded-2xl", narrow)}
                            />
                        ) : null;
                    case "quote":
                        return b.text ? (
                            <blockquote
                                key={key}
                                className={cn("whitespace-pre-line border-l-4 border-brand-500 pl-5 text-xl text-ink-700", narrow)}
                            >
                                {b.text}
                            </blockquote>
                        ) : null;
                    case "cta":
                        return b.text && b.href ? (
                            <div key={key}>
                                <ButtonLink href={b.href} variant="accent" size="lg">
                                    {b.text}
                                </ButtonLink>
                            </div>
                        ) : null;
                    case "cards":
                        return <Cards key={key} block={b} wide={wide} />;
                    default:
                        return b.text ? (
                            <p key={key} className={cn("whitespace-pre-line", narrow)}>
                                {b.text}
                            </p>
                        ) : null;
                }
            })}
        </div>
    );
}

/** A page's content blocks in a standard section (renders nothing if there are none). */
export function PageBody({ blocks = [], className = "py-14" }) {
    if (!blocks.length) return null;
    return (
        <section className={cn("container-x", className)}>
            <Blocks blocks={blocks} wide />
        </section>
    );
}