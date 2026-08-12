import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbJsonLd, pages } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: pages.testIntro.title },
  description: pages.testIntro.description,
  alternates: { canonical: pages.testIntro.path },
  openGraph: {
    title: pages.testIntro.title,
    description: pages.testIntro.description,
    url: pages.testIntro.path,
  },
};

const scaleLabels = [
  "первое утверждение однозначно ближе",
  "скорее ближе первое утверждение",
  "оба утверждения одинаково близко/далеко",
  "скорее ближе второе утверждение",
  "второе утверждение однозначно ближе",
];

export default function TestIntroPage() {
  return (
    <div className="container mx-auto px-4 py-4 lg:py-10">
      <div className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center">
        <h2 className="m-0 text-2xl font-semibold">
          Диагностика управленческого профиля
        </h2>
        <div className="max-w-[600px] text-muted md:ml-10">
          Методика основана на анализе поведенческих паттернов 10 000+
          руководителей. Получите объективное подтверждение ваших сильных сторон
          в управлении. Результаты доступны только вам. Конфиденциальность
          гарантирована.
        </div>
      </div>

      <div className="rounded-lg border border-solid border-border bg-white">
        <div className="p-6">
          <div className="flex flex-col items-center">
            <h3 className="mb-4 text-xl font-semibold">Как проходить?</h3>
            <div className="mb-6 max-w-[700px]">
              <p className="m-0 text-muted">
                Тест состоит из 75 вопросов, которые помогут вам больше узнать о
                своей личности, психологическом профиле и др. Каждый вопрос
                представляет собой пару утверждений, вам нужно выбрать, какое из
                двух вам ближе и насколько вы с ним согласны или не согласны.
              </p>
            </div>

            <div className="mb-4 grid w-full max-w-4xl grid-cols-1 items-start gap-3 lg:grid-cols-[1fr_2fr_1fr]">
              <div className="mb-4 text-center text-xl font-bold text-primary lg:text-left">
                Утверждение 1
              </div>
              <div className="mb-4 flex flex-nowrap justify-between">
                {scaleLabels.map((label) => (
                  <div
                    key={label}
                    className="mx-1 flex flex-col items-center lg:mx-3"
                  >
                    <div className="mb-2 size-[36px] rounded-full border-4 border-solid border-primary" />
                    <div className="text-center text-[8px] md:text-xs lg:text-sm">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mb-4 text-center text-xl font-bold text-primary lg:text-left">
                Утверждение 2
              </div>
            </div>

            <div className="mb-6 max-w-[700px] text-muted">
              Отвечая на вопросы, старайтесь объективно оценивать себя и честно
              указывать, как бы вы поступили в той или иной ситуации без
              чьей-либо помощи и подсказок.
            </div>

            <Link href="/test/take" className="btn btn-primary btn-lg">
              Начать
            </Link>
          </div>
        </div>
      </div>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Главная", path: "/" },
          { name: "Как проходить", path: "/test" },
        ])}
      />
    </div>
  );
}
