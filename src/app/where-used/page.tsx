import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { WHERE_USED_BLOCKS } from "@/lib/where-used";
import { buildBreadcrumbJsonLd, buildPageMetadata, pages } from "@/lib/seo";

export const metadata = buildPageMetadata(pages.whereUsed);

function ServiceLink({ href, children }: { href: string; children: string }) {
  const external = href.startsWith("http");
  if (external) {
    return (
      <a href={href} rel="noopener noreferrer" target="_blank" className="font-semibold text-link hover:underline">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="font-semibold text-link hover:underline">
      {children}
    </Link>
  );
}

export default function WhereUsedPage() {
  return (
    <>
      <section className="space-y-6 bg-white pb-8 pt-8 md:pb-12 md:pt-12">
        <div className="container-page mx-auto max-w-4xl space-y-4">
          <h1 className="sr-only">Где используется</h1>
          <RevealOnScroll>
            <nav
              className="flex flex-wrap gap-2"
              aria-label="Задачи и разделы таблиц"
            >
              {WHERE_USED_BLOCKS.map((block) => (
                <a
                  key={block.id}
                  href={`#${block.id}`}
                  className="rounded-full border border-solid border-border bg-surface-alt px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary hover:text-primary"
                >
                  {block.title.replace("?", "")}
                </a>
              ))}
            </nav>
          </RevealOnScroll>
        </div>
      </section>

      <section className="container-page mx-auto max-w-4xl space-y-12 pb-16 md:pb-20">
        {WHERE_USED_BLOCKS.map((block, blockIndex) => (
          <RevealOnScroll key={block.id} delay={blockIndex * 40}>
            <article id={block.id} className="scroll-mt-24">
              <h2 className="mb-4 text-xl font-bold md:text-2xl">{block.title}</h2>
              <div className="overflow-x-auto rounded-xl border border-solid border-border">
                <table className="where-used-table w-full min-w-[320px] table-fixed border-collapse text-left text-sm md:text-base">
                  <colgroup>
                    <col style={{ width: "62%" }} />
                    <col style={{ width: "38%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-solid border-border bg-surface-alt">
                      <th scope="col" className="px-4 py-3 font-semibold md:w-[62%]">
                        Если ищете
                      </th>
                      <th scope="col" className="px-4 py-3 font-semibold md:w-[38%]">
                        Решение
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr
                        key={`${block.id}-${row.service}-${row.ifLookingFor.slice(0, 24)}`}
                        className="border-b border-solid border-border last:border-b-0"
                      >
                        <td className="px-4 py-3 align-top text-muted">{row.ifLookingFor}</td>
                        <td className="px-4 py-3 align-top">
                          <ServiceLink href={row.href}>{row.service}</ServiceLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </RevealOnScroll>
        ))}
      </section>

      <JsonLd
        data={[
          buildBreadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Где используется", path: pages.whereUsed.path },
          ]),
        ]}
      />
    </>
  );
}
