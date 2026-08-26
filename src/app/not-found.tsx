import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: `Страница не найдена | ${siteConfig.name}` },
  description: "Запрошенная страница не существует или была перемещена.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="space-y-6 bg-white pb-16 pt-12 md:pb-24 md:pt-16">
      <div className="container-page mx-auto max-w-xl space-y-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          404
        </p>
        <h1 className="text-3xl leading-tight md:text-4xl">Страница не найдена</h1>
        <p className="text-lg text-muted">
          Такой страницы нет — возможно, ссылка устарела или адрес введён с ошибкой.
        </p>
        <div className="pt-2">
          <Link href="/" className="btn btn-primary btn-lg font-bold">
            На главную
          </Link>
        </div>
      </div>
    </section>
  );
}
