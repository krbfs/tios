import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { getDemoEncdata } from "@/lib/encdata";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  faqItems,
  pages,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: pages.home.title },
  description: pages.home.description,
  alternates: { canonical: pages.home.path },
  openGraph: {
    title: pages.home.title,
    description: pages.home.description,
    url: pages.home.path,
  },
};

const reasons = [
  {
    title: "Научно‑обоснованный метод",
    text: "Алгоритм проверен на 10 000+ пользователей.",
  },
  {
    title: "75 вопросов ≈ 10 минут",
    text: "Завершите тест за кофе‑брейк и получите результат мгновенно.",
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
    text: "Вы можете проходить наши тесты периодически, отслеживая, таким образом, свое психологическое состояние",
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
        className="space-y-6 bg-surface pb-20 pt-3 md:pb-12 md:pt-8 lg:py-32"
      >
        <div className="container-page flex max-w-[1024px] flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="main image"
            width={300}
            height={300}
            src="/genius.svg"
          />
          <h1 className="text-3xl lg:text-5xl">
            Диагностика управленческого профиля: сфера ваших талантов и карта
            эффективности
          </h1>
          <p className="max-w-[46rem] text-lg text-muted lg:text-2xl">
            Получите объективное подтверждение ваших сильных сторон и
            рекомендации по их оптимизации
          </p>
          <div className="space-x-4">
            <Link href="/test" className="btn btn-primary btn-lg font-bold">
              Узнать свой психотип
            </Link>
            <Link
              href={`/quiz/result?encdata=${encodeURIComponent(getDemoEncdata())}`}
              className="btn btn-outline btn-lg font-bold"
            >
              Пример результата
            </Link>
          </div>
        </div>
      </section>

      <section
        id="heroBenefits"
        className="container mx-auto px-4 pb-20 pt-3 md:pb-12 md:pt-8 lg:py-26"
      >
        <h2 className="mb-6 text-center text-3xl leading-[1.1] sm:text-3xl md:text-4xl">
          Почему стоит пройти тест Teamconstructor
        </h2>
        <ul className="mx-auto max-w-2xl list-none p-0">
          {reasons.map((item, index) => (
            <li
              key={index}
              className="relative mb-4 rounded-lg border border-solid border-border p-4 pl-14 backdrop-blur"
            >
              <span className="absolute left-4 top-7 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white">
                ✓
              </span>
              <h4 className="mb-1 font-semibold leading-tight">{item.title}</h4>
              <p className="text-md text-muted">{item.text}</p>
            </li>
          ))}
        </ul>
        <p className="mx-auto max-w-3xl text-muted sm:text-lg">
          Тест состоит из 75 пар утверждений. Для каждого выберите, какое
          утверждение ближе и насколько вы с ним согласны. Отвечайте честно —
          так вы получите наиболее точный психопрофиль.
        </p>
      </section>

      <section
        id="features"
        className="container mx-auto space-y-6 rounded-2xl bg-slate-50 px-4 py-8 md:py-12 lg:py-24"
      >
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="text-3xl leading-[1.1] sm:text-3xl md:text-4xl">
            Что вы получите после ответа на 75 вопросов
          </h2>
          <p className="max-w-[85%] leading-normal text-muted sm:text-lg sm:leading-7">
            С помощью нашего теста Вы сможете узнать особенности своего
            характера, получить инструмент подтверждения управленческой
            компетентности.
          </p>
        </div>

        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-5xl md:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-solid border-border bg-white"
            >
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
          ))}
        </div>

        <div className="mx-auto text-left md:max-w-[58rem] md:text-center">
          <p className="leading-normal text-muted sm:text-lg sm:leading-7">
            Тест можно проходить без регистрации. В таком случае Вы всегда
            сможете получить доступ к Вашему результату по специальной ссылке,
            сгенерированной после прохождения теста.{" "}
            <b>Зарегистрированные</b> же пользователи могут сохранять все
            результаты и наблюдать за динамикой изменения своего состояния.
          </p>
          <div className="mt-6 space-x-4 text-center">
            <Link href="/test" className="btn btn-primary btn-lg font-bold">
              Пройти тест
            </Link>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="container mx-auto px-4 py-8 md:py-12"
        aria-labelledby="faq-heading"
      >
        <h2
          id="faq-heading"
          className="mb-6 text-center text-3xl leading-[1.1] md:text-4xl"
        >
          Частые вопросы о тесте
        </h2>
        <div className="mx-auto max-w-2xl space-y-3">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="rounded-lg border border-solid border-border p-4"
            >
              <summary className="cursor-pointer font-semibold">
                {item.question}
              </summary>
              <p className="mt-2 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        id="partners"
        className="container mx-auto px-4 py-8 md:py-12 lg:py-24"
      >
        <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-[85%] text-2xl leading-normal text-muted sm:leading-7">
            Наш партнер -{" "}
            <a
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
              href="https://insighter-service.com/"
            >
              ООО Инсайтер
            </a>
          </p>
        </div>
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
