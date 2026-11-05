// src/app/(site)/areas/page.jsx
import { PageHero } from "@/components/site/sections";
import { CtaBand } from "@/components/site/server-sections";
import { SuburbChecker } from "@/components/site/suburb-checker";
import { getAreas } from "@/server/queries/catalog";
import { getPage, pageMetadata } from "@/server/queries/content";
import { PageBody } from "@/components/site/blocks";
import { money } from "@/lib/utils";

/** Header text is edited in Admin › Content › Pages. */
export const generateMetadata = () => pageMetadata("/areas");

export default async function AreasPage() {
  const [{ zones, suburbs }, page] = await Promise.all([getAreas(), getPage("/areas")]);
  return (
    <>
      <PageHero title={page.title} body={page.intro}>
        <div className="mt-8 max-w-xl">
          <SuburbChecker suburbs={suburbs} />
        </div>
      </PageHero>
      <section className="container-x py-14">
        <div className="grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => {
            const list = suburbs.filter((s) => s.zone === z);
            return (
              <div key={z}>
                <h2 className="font-sans text-lg font-semibold tracking-normal">{z}</h2>
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {list.map((s) => (
                    <li key={s.id} className="flex justify-between py-2.5 text-[15px]">
                      <span>
                        {s.name} <span className="text-subtle">{s.postcode}</span>
                      </span>
                      <span className="text-muted">{s.surcharge ? `+${money(s.surcharge)} travel` : "No travel fee"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-10 text-muted">
          Outside these suburbs, including Bruny Island, New Norfolk and the Tasman Peninsula? Contact us and we’ll see what we
          can arrange.
        </p>
      </section>
      <CtaBand />
    </>
  );
}