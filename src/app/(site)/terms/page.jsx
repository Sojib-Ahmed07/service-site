// src/app/(site)/terms/page.jsx
import { LegalPage } from "@/components/site/legal";
import { getPage, pageMetadata } from "@/server/queries/content";

/** Edited in Admin › Content › Pages. */
export const generateMetadata = () => pageMetadata("/terms");

export default async function Page() {
  const page = await getPage("/terms");
  return <LegalPage page={page} />;
}