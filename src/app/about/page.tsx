import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { getDemoEncdata } from "@/lib/encdata";
import {
  PSYCHOTYPE_META,
  RADAR_SCALE_ORDER,
  SCALE_LABELS,
  SYSTEMIC_LABELS,
} from "@/lib/psychotypes";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  pages,
  siteConfig,
} from "@/lib/seo";
import { tiosAcronymLines, tiosAcronymTitle } from "@/lib/tios-acronym";

export const metadata = buildPageMetadata(pages.about);

const steps = [
  {
    title: "75 пар утверждений",
    text: "Каждый блок — два утверждения о типичном поведении. Выберите, какое ближе, и насколько сильно согласны.",
  },
  {
    title: "Шкала от −2 до +2",
    text: "От «однозначно первое» до «однозначно второе». Оценивайте себя за последние 3–6 месяцев.",
  },
  {
    title: "≈ 10 минут",
    text: "Тест можно пройти анонимно. Результат доступен сразу — по ссылке или в личном кабинете после входа.",
  },
];

const resultBlocks = [
  {
    title: "Радар шкал",
    text: "8 поведенческих тенденций: от тревожности и лабильности до ригидности и сензитивности.",
  },
  {
    title: "Основной психотип",
    text: "Один из восьми управленческих архетипов — по доминирующей паре смежных шкал.",
  },
  {
    title: "Карта эффективности",
    text: "Пять системных параметров: энергия, результат, качество, правила, делегирование.",
  },
  {
    title: "Рекомендации",
    text: "Сильные стороны, зоны риска, поведение в стрессе и каналы восстановления энергии.",
  },
];

export default function AboutPage() {
  const demoHref = `/quiz/result?encdata=${encodeURIComponent(getDemoEncdata())}`;
  const scaleLabels = RADAR_SCALE_ORDER.map((key) => SCALE_LABELS[key]);
  const psychotypes = Object.values(PSYCHOTYPE_META).map((item) => item.name);
  const systemicLabels = Object.values(SYSTEMIC_LABELS);

  return (
    <>
      <section className="space-y-6 bg-white pb-12 pt-8 md:pb-16 md:pt-12">
        <div className="container-page mx-auto max-w-3xl space-y-4 text-center">
          <RevealOnScroll>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">
              {siteConfig.russianName} · {siteConfig.shortName}
            </p>
            <h1 className="text-3xl leading-tight md:text-4xl">О тесте ТИОС</h1>
            <p className="text-lg text-muted md:text-xl">
              Онлайн-диагностика управленческого профиля: как вы действуете, принимаете
              решения и ведёте себя в команде.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={80}>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/test"
                className="btn btn-primary btn-lg font-bold"
                data-ga-event="cta_about_start_test"
              >
                Пройти тест ТИОС
              </Link>
              <Link
                href={demoHref}
                className="btn btn-outline btn-lg font-bold"
                data-ga-event="cta_about_demo_result"
              >
                Пример результата
              </Link>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="container-page mx-auto max-w-3xl px-0 pb-12 md:pb-16">
        <RevealOnScroll>
          <div className="rounded-2xl border border-solid border-border bg-surface-alt p-6 md:p-8">
            <h2 className="mb-4 text-2xl font-bold">Что означает название</h2>
            <div className="space-y-3 text-lg leading-relaxed">
              <p className="font-semibold text-primary">{tiosAcronymTitle}</p>
              <div className="rounded-xl border border-solid border-border bg-white px-5 py-4 text-[0.9375rem] leading-7 md:text-base">
                <p>
                  Тест Индивидуальных Операционных Сценариев
                  <br />
                  <span className="text-muted">
                    (Тест Индивидуальных Операционных Стратегий (или Стилей)
                  </span>
                </p>
                <p className="mt-3">— {tiosAcronymLines[2]}</p>
                <p className="mt-3">
                  —{" "}
                  <Link href="/author" className="font-semibold text-link hover:underline">
                    {tiosAcronymLines[3]}
                  </Link>
                </p>
                <p className="mt-3">
                  —{" "}
                  <Link href="/author" className="font-semibold text-link hover:underline">
                    {tiosAcronymLines[4]}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <section className="container-page mx-auto max-w-3xl space-y-6 pb-12 md:pb-16">
        <RevealOnScroll>
          <h2 className="text-center text-2xl font-bold md:text-3xl">Для чего нужен тест</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted sm:text-lg">
            ТИОС помогает увидеть устойчивые паттерны поведения руководителя: сильные стороны,
            риски в стрессе и зоны для развития. Это не медицинский диагноз, а инструмент
            самопознания и работы с командой.
          </p>
        </RevealOnScroll>

        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((item, index) => (
            <RevealOnScroll key={item.title} delay={index * 60}>
              <article className="h-full rounded-xl border border-solid border-border p-5">
                <p className="mb-2 text-sm font-semibold text-primary">{index + 1}</p>
                <h3 className="mb-2 font-bold">{item.title}</h3>
                <p className="text-sm text-muted">{item.text}</p>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="bg-surface-alt py-12 md:py-16">
        <div className="container-page mx-auto max-w-3xl space-y-8">
          <RevealOnScroll>
            <h2 className="text-center text-2xl font-bold md:text-3xl">Что измеряет ТИОС</h2>
          </RevealOnScroll>

          <RevealOnScroll delay={40}>
            <div className="rounded-xl border border-solid border-border bg-white p-6">
              <h3 className="mb-3 font-bold">8 шкал радара</h3>
              <p className="mb-4 text-sm text-muted">
                Каждая шкала — от 0 до 30. На результате они показаны на радарной диаграмме.
              </p>
              <div className="flex flex-wrap gap-2">
                {scaleLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-solid border-border bg-surface-alt px-3 py-1 text-sm"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={80}>
            <div className="rounded-xl border border-solid border-border bg-white p-6">
              <h3 className="mb-3 font-bold">8 психотипов</h3>
              <p className="mb-4 text-sm text-muted">
                Основной тип определяется по доминирующей паре смежных шкал на радаре.
              </p>
              <div className="flex flex-wrap gap-2">
                {psychotypes.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-solid border-border bg-surface-alt px-3 py-1 text-sm"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={120}>
            <div className="rounded-xl border border-solid border-border bg-white p-6">
              <h3 className="mb-3 font-bold">Карта эффективности</h3>
              <p className="mb-4 text-sm text-muted">
                Пять системных параметров управленческой эффективности — отдельный блок результата.
              </p>
              <div className="flex flex-wrap gap-2">
                {systemicLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-solid border-border bg-surface-alt px-3 py-1 text-sm"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="container-page mx-auto max-w-3xl space-y-6 py-12 md:py-16">
        <RevealOnScroll>
          <h2 className="text-center text-2xl font-bold md:text-3xl">Что вы получите</h2>
        </RevealOnScroll>
        <div className="grid gap-4 sm:grid-cols-2">
          {resultBlocks.map((item, index) => (
            <RevealOnScroll key={item.title} delay={index * 50}>
              <article className="h-full rounded-xl border border-solid border-border p-5">
                <h3 className="mb-2 font-bold">{item.title}</h3>
                <p className="text-sm text-muted">{item.text}</p>
              </article>
            </RevealOnScroll>
          ))}
        </div>
        <RevealOnScroll delay={120}>
          <p className="text-center text-muted">
            Зарегистрированные пользователи сохраняют историю прохождений в{" "}
            <Link href="/cabinet" className="font-semibold text-link hover:underline">
              личном кабинете
            </Link>
            . Без регистрации результат остаётся доступен по уникальной ссылке.
          </p>
        </RevealOnScroll>
      </section>

      <section className="container-page mx-auto max-w-3xl pb-16 md:pb-20">
        <RevealOnScroll>
          <div className="rounded-2xl border border-solid border-border bg-white p-8 text-center">
            <h2 className="text-2xl font-bold">Готовы узнать свой профиль?</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              {siteConfig.questionsCount} вопросов, около {siteConfig.durationMinutes} минут —
              бесплатно и без обязательной регистрации.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/test"
                className="btn btn-primary btn-lg font-bold"
                data-ga-event="cta_about_start_test_footer"
              >
                Начать тест ТИОС
              </Link>
              <Link
                href={demoHref}
                className="btn btn-outline btn-lg font-bold"
                data-ga-event="cta_about_demo_result_footer"
              >
                Посмотреть демо
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <JsonLd
        data={[
          buildBreadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "О тесте", path: pages.about.path },
          ]),
        ]}
      />
    </>
  );
}
