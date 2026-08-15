import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { authorInfo } from "@/lib/author";
import { buildBreadcrumbJsonLd, pages, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: pages.author.title },
  description: pages.author.description,
  alternates: { canonical: pages.author.path },
  openGraph: {
    title: pages.author.title,
    description: pages.author.description,
    url: pages.author.path,
  },
};

export default function AuthorPage() {
  return (
    <>
      <section className="bg-white pb-12 pt-8 md:pb-16 md:pt-12">
        <div className="container-page mx-auto max-w-4xl">
          <RevealOnScroll>
            <div className="grid gap-8 md:grid-cols-[240px_1fr] md:items-start">
              <figure className="mx-auto w-full max-w-[240px] text-center md:mx-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/author-portrait-placeholder.svg"
                  alt={authorInfo.portraitAlt}
                  width={240}
                  height={300}
                  className="block w-full rounded-2xl border border-solid border-border bg-surface-alt"
                />
                <figcaption className="mt-2 text-xs text-muted">Фото скоро</figcaption>
              </figure>

              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {authorInfo.roleRu}
                </p>
                <p className="text-sm text-muted">{authorInfo.currentRoleRu}</p>
                <h1 className="text-3xl leading-tight md:text-4xl">{authorInfo.fullName}</h1>
                <p className="text-lg text-muted">{authorInfo.nameEn}</p>
                <p className="text-base leading-relaxed text-muted md:text-lg">{authorInfo.intro}</p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="container-page mx-auto max-w-4xl space-y-8 pb-12 md:pb-16">
        <RevealOnScroll>
          <article className="rounded-xl border border-solid border-border bg-surface-alt p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold">Лаборатория мозга</h2>
            <p className="leading-relaxed text-muted">{authorInfo.labPeriod}</p>
            <ul className="mt-5 list-disc space-y-3 pl-5 text-muted">
              {authorInfo.projectBullets.map((item) => (
                <li key={item} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </RevealOnScroll>

        <div className="space-y-4">
          {authorInfo.timeline.map((item, index) => (
            <RevealOnScroll key={item.period} delay={index * 50}>
              <article className="rounded-xl border border-solid border-border p-6">
                <p className="mb-2 text-sm font-semibold text-primary">{item.period}</p>
                <p className="leading-relaxed text-muted">{item.text}</p>
              </article>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={120}>
          <article className="rounded-xl border border-solid border-primary/20 bg-white p-6 md:p-8">
            <h2 className="mb-3 text-xl font-bold">TIOS / ТИОС</h2>
            <p className="leading-relaxed text-muted">{authorInfo.tiosNote}</p>
          </article>
        </RevealOnScroll>
      </section>

      <section className="container-page mx-auto max-w-4xl pb-16 md:pb-20">
        <RevealOnScroll>
          <div className="rounded-2xl border border-solid border-border bg-white p-8 text-center">
            <h2 className="text-2xl font-bold">Узнать больше</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              Подробнее о методике, шкалах и результатах — на странице о тесте. По вопросам
              сотрудничества и разбору результатов — через Insighter или email поддержки.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/about"
                className="btn btn-primary btn-lg font-bold"
                data-ga-event="cta_author_about_test"
              >
                О тесте ТИОС
              </Link>
              <Link
                href="/test"
                className="btn btn-outline btn-lg font-bold"
                data-ga-event="cta_author_start_test"
              >
                Пройти тест
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted">
              <a
                href={siteConfig.partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-link hover:underline"
              >
                {siteConfig.partner.name}
              </a>
              {" · "}
              <a href={`mailto:${siteConfig.email}`} className="font-semibold text-link hover:underline">
                {siteConfig.email}
              </a>
            </p>
          </div>
        </RevealOnScroll>
      </section>

      <JsonLd
        data={[
          buildBreadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Об авторе", path: pages.author.path },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: authorInfo.fullName,
            alternateName: authorInfo.nameEn,
            jobTitle: authorInfo.roleEn,
            description: authorInfo.currentRoleEn,
            url: `${siteConfig.url}${pages.author.path}`,
            worksFor: {
              "@type": "Organization",
              name: siteConfig.partner.name,
              url: siteConfig.partner.url,
            },
          },
        ]}
      />
    </>
  );
}
