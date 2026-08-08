"use client";

import { useState } from "react";
import Link from "next/link";
import { RadarChart } from "@/components/RadarChart";
import { mockResult } from "@/data/mock-result";

export default function ResultsPage() {
  const [copied, setCopied] = useState(false);

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
    <div className="container-page py-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{mockResult.name}</h1>
          <p className="text-muted max-w-2xl">{mockResult.summary}</p>
        </div>
        <Link href="/test" className="btn btn-outline self-start">
          Пройти ещё раз
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-center mb-10">
        <RadarChart scales={mockResult.scales} />
        <div className="grid grid-cols-2 gap-3">
          {mockResult.scales.map((scale) => (
            <div
              key={scale.key}
              className="rounded-lg border border-solid border-border px-3 py-2 flex items-center justify-between"
            >
              <span className="capitalize text-sm">{scale.label}</span>
              <span className="font-bold text-primary">{scale.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="text-muted mb-1">Основной психотип:</div>
        <div className="text-2xl font-bold text-primary capitalize mb-6">
          {mockResult.mainType}
        </div>

        <div className="border border-solid border-border rounded-lg overflow-hidden">
          {mockResult.sections.map((section, index) => (
            <div
              key={section.title}
              className={[
                "grid md:grid-cols-[280px_1fr] border-0 border-b border-solid border-border last:border-b-0",
                index % 2 === 0 ? "bg-surface" : "bg-white",
              ].join(" ")}
            >
              <div className="px-4 py-3 font-semibold text-sm md:border-0 md:border-r md:border-solid md:border-border">
                {section.title}
              </div>
              <div className="px-4 py-3 text-sm whitespace-pre-line text-foreground/90">
                {section.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Ссылка для доступа к вашему результату</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            readOnly
            value={mockResult.shareUrl}
            className="flex-1 rounded-md border border-solid border-border px-3 py-2 bg-surface"
          />
          <button type="button" className="btn btn-primary" onClick={copyLink}>
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
      </section>

      <section className="mb-4">
        <h2 className="text-xl font-bold text-center mb-2">
          Для получения более точного и полного премиум-отчета свяжитесь с нами
        </h2>
        <p className="text-center text-muted mb-6">
          <a href="mailto:support@teamconstructor.pro" className="text-primary hover:underline">
            Контакт
          </a>
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {mockResult.premiumCards.map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-solid border-border p-5 flex flex-col gap-3"
            >
              <h3 className="font-bold text-primary">{card.title}</h3>
              <p className="text-muted text-sm flex-1">{card.description}</p>
              <a href="mailto:support@teamconstructor.pro" className="btn btn-primary self-start">
                Перейти
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
