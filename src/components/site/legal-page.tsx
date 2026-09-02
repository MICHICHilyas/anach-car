import type { LegalDocument } from "@/config/legal";
import { AGENCY } from "@/config/agency";

export function LegalPageContent({ document }: { document: LegalDocument }) {
  return (
    <>
      <section className="border-b border-navy-100 bg-navy-50/40">
        <div className="container-page py-12 lg:py-16">
          <h1 className="text-[2rem] font-semibold tracking-tight text-navy-950 sm:text-[2.4rem]">
            {document.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-navy-500">
            {document.intro}
          </p>
          <p className="mt-4 text-[12.5px] text-navy-400">
            Dernière mise à jour : {document.updatedAt} · {AGENCY.legalName}
          </p>
        </div>
      </section>

      <div className="container-page py-12 lg:py-16">
        <article className="max-w-3xl space-y-10">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-[18px] font-semibold text-navy-950">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-[14.5px] leading-relaxed text-navy-600"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>
    </>
  );
}
