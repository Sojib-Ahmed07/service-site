// src/app/(site)/guarantee/page.jsx
import { PageHero } from "@/components/site/sections";
import { PageBody } from "@/components/site/blocks";
import { CtaBand } from "@/components/site/server-sections";
import { getPage, pageMetadata } from "@/server/queries/content";

/** Edited in Admin › Content › Pages › The guarantee. */
export const generateMetadata = () => pageMetadata("/guarantee");

export default async function GuaranteePage() {
  const page = await getPage("/guarantee");
  return (
    <>
      <PageHero title={page.title} body={page.intro} />
      <PageBody blocks={page.blocks} className="py-16" />
      <CtaBand />
    </>
  );
}