// src/app/(site)/privacy/page.jsx
import { LegalPage } from "@/components/site/legal";
import { getPage, pageMetadata } from "@/server/queries/content";

/** Edited in Admin › Content › Pages. */
export const generateMetadata = () => pageMetadata("/privacy");

export default async function Page() {
  const page = await getPage("/privacy");
  return <LegalPage page={page} />;
}