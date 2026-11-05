// src/app/(site)/how-it-works/page.jsx
import { HowItWorks, PageHero } from "@/components/site/sections";
import { Blocks } from "@/components/site/blocks";
import { CtaBand, TrustStrip } from "@/components/site/server-sections";
import { getPage, pageMetadata } from "@/server/queries/content";
import { getContentVars, getHomepage } from "@/server/queries/settings";
import { fillVars } from "@/lib/cms";

/** Text is edited in Admin › Content › Pages; the three steps in Admin › Content › Homepage. */
export const generateMetadata = () => pageMetadata("/how-it-works");

export default async function HowItWorksPage() {
  const [page, home, vars] = await Promise.all([getPage("/how-it-works"), getHomepage(), getContentVars()]);
  const steps = home.steps.map((s) => ({ title: fillVars(s.title, vars), body: fillVars(s.body, vars) }));
  return (
    <>
      <PageHero title={page.title} body={page.intro} />
      <section className="container-x py-16">
        <HowItWorks steps={steps} />
      </section>
      {page.blocks.length > 0 && (
        <section className="border-y border-line bg-surface py-16">
          <div className="container-x">
            <Blocks blocks={page.blocks} wide />
          </div>
        </section>
      )}
      <section className="container-x py-14">
        <TrustStrip />
      </section>
      <CtaBand />
    </>
  );
}