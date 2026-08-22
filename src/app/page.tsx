import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { getDemoEncdata } from "@/lib/encdata";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildPageMetadata,
  faqItems,
  pages,
} from "@/lib/seo";

export const metadata = buildPageMetadata(pages.home);

const reasons = [
  {
    title: "Научно‑обоснованный метод",
    text: "Алгоритм проверен на 10 000+ пользователей.",
  },
  {
    title: "75 вопросов ≈ 10 минут",
    text: "Завершите тест ТИОС за кофе‑брейк и получите результат мгновенно.",
  },
  {
    title: "Бесплатно и без регистрации",
    text: "Можно пройти анонимно, а результат останется по уникальной ссылке.",
  },
  {
    title: "Детальный психопрофиль",
    text: "Инструмент снижения рисков при работе в команде.",
  },
  {
    title: "Конфиденциальность данных",
    text: "Результаты шифруются, доступны только вам и нашим специалистам.",
  },
];

const features = [
  {
    icon: "/rocket.svg",
    alt: "Динамика наблюдений",
    title: "Динамика наблюдений",
    text: "Вы можете проходить тест ТИОС периодически, отслеживая, таким образом, свое психологическое состояние",
  },
  {
    icon: "/calculator.svg",
    alt: "Безопасность результатов",
    title: "Безопасность результатов",
    text: "Все результаты Ваших тестирований хранятся в безопасной базе данных. Доступ имеете только Вы и наши специалисты",
  },
  {
    icon: "/taking-notes.svg",
    alt: "Индивидуальный подход",
    title: "Индивидуальный подход",
    text: "Вы всегда можете обратиться к нашим специалистам за квалифицированным персональным разбором Вашего управленческого профиля",
  },
];

export default function HomePage() {
  return (
    <>
      <section
        id="main"
        className="space-y-6 bg-white pb-20 pt-3 md:pb-12 md:pt-8 lg:py-32"
      >
        <div className="container-page flex max-w-[1024px] flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="main image"
            width={300}
            height={300}
            src="/genius.svg"
            className="motion-hero-img"
          />
          <h1 className="motion-fade-up motion-delay-1 text-3xl lg:text-5xl">
            Диагностика управленческого профиля: сфера ваших талантов и карта
            эффективности
          </h1>
          <p className="motion-fade-up motion-delay-2 max-w-[46rem] text-lg text-muted lg:text-2xl">
            Получите объективное подтверждение ваших сильных сторон и
            рекомендации по их оптимизации
          </p>
          <div className="motion-fade-up motion-delay-3 space-x-4">
          <Link
            href="/test"
            className="btn btn-primary btn-lg font-bold"
            data-ga-event="cta_home_start_test"
          >
            Узнать свой психотип
          </Link>
          <Link
            href={`/quiz/result?encdata=${encodeURIComponent(getDemoEncdata())}`}
            className="btn btn-outline btn-lg font-bold"
            data-ga-event="cta_home_demo_result"
          >
              Пример результата
            </Link>
          </div>
        </div>
      </section>

      <section id="heroBenefits" className="benefits-section">
        <div className="container-page">
          <RevealOnScroll>
            <div className="benefits-section__head">
              <p className="benefits-section__eyebrow">Преимущества теста</p>
              <h2 className="benefits-section__title">Почему стоит пройти тест ТИОС</h2>
            </div>
          </RevealOnScroll>
          <ul className="benefits-list">
            {reasons.map((item, index) => (
              <RevealOnScroll key={item.title} delay={index * 90}>
                <li className="benefit-card">
                  <span className="benefit-card__index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="benefit-card__body">
                    <h3 className="benefit-card__title">{item.title}</h3>
                    <p className="benefit-card__text">{item.text}</p>
                  </div>
                </li>
              </RevealOnScroll>
            ))}
          </ul>
          <RevealOnScroll delay={180}>
            <p className="benefits-section__lead">
              Тест ТИОС состоит из 75 пар утверждений. Для каждого выберите, какое
              утверждение ближе и насколько вы с ним согласны. Отвечайте честно —
              так вы получите наиболее точный психопрофиль.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section
        id="features"
        className="container mx-auto space-y-6 rounded-2xl bg-white px-4 py-8 md:py-12 lg:py-24"
      >
        <RevealOnScroll>
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl leading-[1.1] sm:text-3xl md:text-4xl">
              Что вы получите после ответа на 75 вопросов
            </h2>
            <p className="max-w-[85%] leading-normal text-muted sm:text-lg sm:leading-7">
              С помощью теста ТИОС Вы сможете узнать особенности своего
              характера, получить инструмент подтверждения управленческой
              компетентности.
            </p>
          </div>
        </RevealOnScroll>

        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-5xl md:grid-cols-3">
          {features.map((item, index) => (
            <RevealOnScroll key={item.title} delay={index * 80}>
              <div className="motion-pop-in h-full rounded-lg border border-solid border-border bg-white">
                <div className="p-6">
                  <div className="rounded-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={item.alt}
                      width={150}
                      height={150}
                      src={item.icon}
                      style={{ display: "block", margin: "0 auto 15px" }}
                    />
                    <div className="space-y-2">
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="text-sm text-muted">{item.text}</p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={100}>
          <div className="mx-auto text-left md:max-w-[58rem] md:text-center">
            <p className="leading-normal text-muted sm:text-lg sm:leading-7">
              Тест ТИОС можно проходить без регистрации. В таком случае Вы всегда
              сможете получить доступ к Вашему результату по специальной ссылке,
              сгенерированной после прохождения теста.{" "}
              <b>Зарегистрированные</b> же пользователи могут сохранять все
              результаты и наблюдать за динамикой изменения своего состояния.
            </p>
            <div className="mt-6 space-x-4 text-center">
              <Link
                href="/test"
                className="btn btn-primary btn-lg font-bold"
                data-ga-event="cta_home_start_test_footer"
              >
                Пройти тест ТИОС
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <section
        id="faq"
        className="container mx-auto px-4 py-8 md:py-12"
        aria-labelledby="faq-heading"
      >
        <RevealOnScroll>
          <h2
            id="faq-heading"
            className="mb-6 text-center text-3xl leading-[1.1] md:text-4xl"
          >
            Частые вопросы о тесте ТИОС
          </h2>
        </RevealOnScroll>
        <div className="mx-auto max-w-2xl space-y-3">
          {faqItems.map((item, index) => (
            <RevealOnScroll key={item.question} delay={index * 50}>
              <details className="rounded-lg border border-solid border-border p-4">
                <summary className="cursor-pointer font-semibold">
                  {item.question}
                </summary>
                <p className="mt-2 text-muted">{item.answer}</p>
              </details>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section
        id="partners"
        className="container mx-auto px-4 py-8 md:py-12 lg:py-24"
      >
        <RevealOnScroll>
          <div className="mx-auto max-w-[58rem] rounded-lg border border-solid border-border bg-white p-8 text-center md:p-10">
            <h2 className="text-2xl font-bold md:text-3xl">Insighter</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted sm:text-lg sm:leading-7">
              Поведенческая аналитика, исследования аудитории и инструменты для
              развития команд и руководителей.
            </p>
            <a
              href="https://insighter.by/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg mt-6 font-bold"
              data-ga-event="cta_home_partner_insighter"
            >
              Перейти на insighter.by
            </a>
          </div>
        </RevealOnScroll>
      </section>

      <JsonLd
        data={[
          buildFaqJsonLd(),
          buildBreadcrumbJsonLd([{ name: "Главная", path: "/" }]),
        ]}
      />
    </>
  );
}
