// src/app/(site)/blog/page.jsx
import Link from "next/link";
import { PageHero } from "@/components/site/sections";
import { EmptyState } from "@/components/ui/misc";
import { Photo } from "@/components/ui/photo";
import { PageBody } from "@/components/site/blocks";
import { getPage, getPublishedPosts, pageMetadata } from "@/server/queries/content";
import { formatDate } from "@/lib/utils";

/** Header text is edited in Admin › Content › Pages; posts in Admin › Content › Blog. */
export const generateMetadata = () => pageMetadata("/blog");

export default async function BlogPage() {
  const [posts, page] = await Promise.all([getPublishedPosts(), getPage("/blog")]);
  const [lead, ...rest] = posts;
  return (
    <>
      <PageHero title={page.title} body={page.intro} />
      <PageBody blocks={page.blocks} className="pt-14" />
      {!lead ? (
        <section className="container-x py-14">
          <EmptyState title="No guides yet" body="Check back soon." />
        </section>
      ) : (
        <section className="container-x py-14">
          <Link
            href={`/blog/${lead.slug}`}
            className="group grid overflow-hidden rounded-[2rem] border border-line bg-surface md:grid-cols-2"
          >
            <div className="relative aspect-[16/10] bg-ink-800 md:aspect-auto">
              {lead.coverImage && <Photo src={lead.coverImage} alt="" sizes={900} className="absolute inset-0 h-full" />}
              <div className="relative flex h-full items-end p-8">
                {lead.category && (
                  <span className="rounded-full bg-brand-500 px-3 py-1 text-sm font-semibold text-ink">{lead.category}</span>
                )}
              </div>
            </div>
            <div className="p-8 sm:p-10">
              <p className="text-sm text-muted">
                {formatDate(lead.date, { day: "numeric", month: "long", year: "numeric" })}, {lead.readTime} read
              </p>
              <h2 className="mt-3 text-3xl font-semibold group-hover:text-ink-900">{lead.title}</h2>
              <p className="mt-3 text-lg text-muted">{lead.excerpt}</p>
            </div>
          </Link>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {rest.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group rounded-[var(--radius-card)] border border-line bg-surface p-6 hover:border-brand-500"
              >
                <p className="text-sm text-muted">{[p.category, `${p.readTime} read`].filter(Boolean).join(", ")}</p>
                <h3 className="mt-2 font-sans text-xl font-semibold tracking-normal group-hover:text-ink-900">{p.title}</h3>
                <p className="mt-2 text-muted">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}