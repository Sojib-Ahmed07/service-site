// src/app/(site)/blog/[slug]/page.jsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CtaBand } from "@/components/site/server-sections";
import { Blocks } from "@/components/site/blocks";
import { Photo } from "@/components/ui/photo";
import { getPublishedPost } from "@/server/queries/content";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getPublishedPost(slug);
  return p ? { title: p.title, description: p.excerpt } : {};
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  const paragraphs = post.blocks.length ? [] : post.body.split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <>
      <article className="container-x max-w-3xl py-14">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> All guides
        </Link>
        <p className="mt-8 text-sm text-muted">
          {[post.category, formatDate(post.date, { day: "numeric", month: "long", year: "numeric" })].filter(Boolean).join(", ")}
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">{post.title}</h1>
        {post.excerpt && <p className="mt-5 text-xl leading-relaxed text-muted">{post.excerpt}</p>}
        {post.coverImage && (
          <Photo src={post.coverImage} alt="" sizes={1200} priority className="mt-10 aspect-[16/9] rounded-2xl" />
        )}
        <div className="mt-10">
          {post.blocks.length > 0 ? (
            <Blocks blocks={post.blocks} />
          ) : (
            <div className="space-y-6 text-lg leading-[1.75]">
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}
        </div>
      </article>
      <CtaBand />
    </>
  );
}