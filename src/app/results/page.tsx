"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RadarChart } from "@/components/RadarChart";
import { mockResult } from "@/data/mock-result";

export default function ResultsPage() {
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(5);
  const max = useMemo(() => 5 + scale, [scale]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(mockResult.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="container mx-auto p-4 lg:p-8">
      <div className="rounded-lg border border-solid border-border bg-white">
        <div className="p-4 lg:p-6">
          <div className="mb-12 grid items-center gap-6 lg:grid-cols-[220px_1fr_200px]">
            <div className="flex flex-col items-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={mockResult.name}
                width={220}
                height={220}
                className="mb-4 inline-block rounded-full"
                src="/radar-sample.png"
              />
              <h6 className="m-0 mb-2 text-base font-semibold">
                {mockResult.name}
              </h6>
              <div className="text-sm text-muted">{mockResult.summary}</div>
            </div>

            <div className="m-auto max-w-[480px] w-full">
              <RadarChart scales={mockResult.scales} max={max} />
              <b>Изменить масштаб</b>
              <input
                type="range"
                min={0}
                max={25}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>

            <div
              className="overflow-hidden rounded-lg"
              style={{ border: "1px solid rgb(240, 240, 240)" }}
            >
              {mockResult.scales.map((item, index) => (
                <div
                  key={item.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 12px",
                    borderBottom:
                      index === mockResult.scales.length - 1
                        ? "none"
                        : "1px solid rgb(240, 240, 240)",
                    fontSize: 14,
                  }}
                >
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <hr className="mb-6 border-border" />

          <div className="mb-4">
            <span>
              Основной психотип:
              <strong> {mockResult.mainType}</strong>
            </span>
          </div>

          <div className="mb-8 overflow-hidden rounded-lg border border-solid border-border">
            {mockResult.sections.map((section, index) => (
              <div
                key={section.title}
                className={[
                  "grid border-0 border-b border-solid border-border last:border-b-0 md:grid-cols-[280px_1fr]",
                  index % 2 === 0 ? "bg-slate-50" : "bg-white",
                ].join(" ")}
              >
                <div className="border-0 border-b border-solid border-border px-4 py-3 text-sm font-semibold md:border-b-0 md:border-r">
                  {section.title}
                </div>
                <div className="whitespace-pre-line px-4 py-3 text-sm">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          <section className="mb-10">
            <h2 className="mb-3 text-xl font-bold">
              Ссылка для доступа к вашему результату
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                readOnly
                value={mockResult.shareUrl}
                className="flex-1 rounded-md border border-solid border-border bg-slate-50 px-3 py-2"
              />
              <button type="button" className="btn btn-primary" onClick={copyLink}>
                {copied ? "Скопировано" : "Копировать"}
              </button>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-center text-xl font-bold">
              Для получения более точного и полного премиум-отчета свяжитесь с
              нами
            </h2>
            <p className="mb-6 text-center text-muted">
              <a
                href="mailto:support@teamconstructor.pro"
                className="text-primary underline"
              >
                Контакт
              </a>
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {mockResult.premiumCards.map((card) => (
                <div
                  key={card.title}
                  className="flex flex-col gap-3 rounded-lg border border-solid border-border p-5"
                >
                  <h3 className="font-bold">{card.title}</h3>
                  <p className="flex-1 text-sm text-muted">{card.description}</p>
                  <a
                    href="mailto:support@teamconstructor.pro"
                    className="btn btn-primary self-start"
                  >
                    Перейти
                  </a>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-8">
            <Link href="/test" className="btn btn-outline">
              Пройти ещё раз
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
