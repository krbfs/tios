import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbJsonLd, pages } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: pages.testTake.title },
  description: pages.testTake.description,
  alternates: { canonical: pages.testTake.path },
  openGraph: {
    title: pages.testTake.title,
    description: pages.testTake.description,
    url: pages.testTake.path,
  },
};

export default function TestTakeLayout({
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
          { name: "Как проходить", path: "/test" },
          { name: "Пройти тест", path: "/test/take" },
        ])}
      />
    </>
  );
}
