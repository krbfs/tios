import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbJsonLd, pages } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: pages.results.title },
  description: pages.results.description,
  alternates: { canonical: pages.results.path },
  openGraph: {
    title: pages.results.title,
    description: pages.results.description,
    url: pages.results.path,
  },
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Главная", path: "/" },
          { name: "Пример результата", path: "/results" },
        ])}
      />
    </>
  );
}
