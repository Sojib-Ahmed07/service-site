// src/components/site/legal.jsx
import { PageHero } from "@/components/site/sections";
import { Blocks } from "@/components/site/blocks";
import { formatDate } from "@/lib/utils";

/** "Changes and cancellations" → "changes-and-cancellations" (unique within the page). */
function anchors(titles) {
  const seen = {};
  return titles.map((t) => {
    const base =
      String(t)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "section";
    seen[base] = (seen[base] ?? 0) + 1;
    return seen[base] > 1 ? `${base}-${seen[base]}` : base;
  });
}

/** Splits a page's blocks into sections at each heading. */
function toSections(blocks) {
  const sections = [];
  let current = { title: null, blocks: [] };
  for (const b of blocks) {
    if (b.type === "heading") {
      if (current.title || current.blocks.length) sections.push(current);
      current = { title: b.text, blocks: [] };
    } else {
      current.blocks.push(b);
    }
  }
  if (current.title || current.blocks.length) sections.push(current);
  const ids = anchors(sections.map((s) => s.title ?? "intro"));
  return sections.map((s, i) => ({ ...s, id: ids[i] }));
}

/** Long-form page used by Terms and Privacy. Content comes from Admin › Content › Pages. */
export function LegalPage({ page }) {
  const sections = toSections(page.blocks);
  const titled = sections.filter((s) => s.title);
  const updated = page.updatedAt ? `Last updated ${formatDate(page.updatedAt, { day: "numeric", month: "long", year: "numeric" })}.` : "";
  return (
    <>
      <PageHero title={page.title} body={[updated, page.intro].filter(Boolean).join(" ")} />
      <div className="container-x grid gap-10 py-14 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label="On this page">
          {titled.length > 1 && (
            <ul className="sticky top-28 space-y-2 text-sm">
              {titled.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-muted hover:text-ink">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <div className="max-w-3xl space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              {s.title && <h2 className="font-sans text-xl font-semibold tracking-normal">{s.title}</h2>}
              <Blocks blocks={s.blocks} className="mt-3 space-y-3 leading-relaxed text-muted" />
            </section>
          ))}
        </div>
      </div>
    </>
  );
}