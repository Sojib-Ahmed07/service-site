// src/components/site/blocks.jsx
/**
 * Renders content blocks saved by the admin ContentEditor (pages and blog posts).
 * Block shapes: { type: "heading" | "text" | "image" | "quote" | "cta", text, src?, alt?, href? }
 */
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";

export function Blocks({ blocks = [] }) {
    if (!blocks.length) return null;
    return (
        <div className="space-y-6 text-lg leading-[1.75]">
            {blocks.map((b, i) => {
                const key = b.id ?? i;
                switch (b.type) {
                    case "heading":
                        return b.text ? (
                            <h2 key={key} className="pt-4 text-2xl font-semibold leading-tight">
                                {b.text}
                            </h2>
                        ) : null;
                    case "image":
                        return b.src ? (
                            <Photo key={key} src={b.src} alt={b.alt ?? ""} sizes={1200} className="aspect-[16/9] rounded-2xl" />
                        ) : null;
                    case "quote":
                        return b.text ? (
                            <blockquote key={key} className="border-l-4 border-brand-500 pl-5 text-xl text-ink-700">
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
                    default:
                        return b.text ? <p key={key}>{b.text}</p> : null;
                }
            })}
        </div>
    );
}