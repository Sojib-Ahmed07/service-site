import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { blogBody, blogPosts } from "@/lib/data";
import { CtaBand } from "@/components/site/sections";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return blogPosts.filter((p) => p.status === "published").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = blogPosts.find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.excerpt } : {};
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug && p.status === "published");
  if (!post) notFound();

  return (
    <>
      <article className="container-x max-w-3xl py-14">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> All guides
        </Link>
        <p className="mt-8 text-sm text-muted">
          {post.category}, {formatDate(post.date, { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">{post.title}</h1>
        <p className="mt-5 text-xl leading-relaxed text-muted">{post.excerpt}</p>
        {/* Replace with rich text from the CMS (e.g. MDX or a Tiptap JSON renderer). */}
        <div className="mt-10 space-y-6 text-lg leading-[1.75]">
          {blogBody.map((para) => (
            <p key={para.slice(0, 24)}>{para}</p>
          ))}
        </div>
      </article>
      <CtaBand />
    </>
  );
}
