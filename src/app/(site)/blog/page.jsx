import Link from "next/link";
import { blogPosts } from "@/lib/data";
import { PageHero } from "@/components/site/sections";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Home care guides" };

export default function BlogPage() {
  const posts = blogPosts.filter((p) => p.status === "published");
  const [lead, ...rest] = posts;
  return (
    <>
      <PageHero title="Home care guides" body="Practical advice for looking after a home in southern Tasmania’s climate." />
      <section className="container-x py-14">
        <Link
          href={`/blog/${lead.slug}`}
          className="group grid overflow-hidden rounded-[2rem] border border-line bg-surface md:grid-cols-2"
        >
          <div className="aspect-[16/10] bg-ink-800 md:aspect-auto">
            <div className="flex h-full items-end p-8">
              <span className="rounded-full bg-brand-500 px-3 py-1 text-sm font-semibold text-ink">{lead.category}</span>
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
              <p className="text-sm text-muted">
                {p.category}, {p.readTime} read
              </p>
              <h3 className="mt-2 font-sans text-xl font-semibold tracking-normal group-hover:text-ink-900">{p.title}</h3>
              <p className="mt-2 text-muted">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
