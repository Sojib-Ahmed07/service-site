import { PageHero } from "@/components/site/sections";

/** Simple long-form page used by Terms and Privacy. Content is editable from Admin › CMS › Pages. */
export function LegalPage({ title, updated, sections }) {
  return (
    <>
      <PageHero
        title={title}
        body={`Last updated ${updated}. This is template text — have it reviewed by a lawyer before launch.`}
      />
      <div className="container-x grid gap-10 py-14 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block" aria-label="On this page">
          <ul className="sticky top-28 space-y-2 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-muted hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="max-w-3xl space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="font-sans text-xl font-semibold tracking-normal">{s.title}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-muted">
                {s.body.map((p) => (
                  <p key={p.slice(0, 30)}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
