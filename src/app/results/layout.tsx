import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbJsonLd, buildPageMetadata, pages } from "@/lib/seo";

export const metadata = buildPageMetadata(pages.results);

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
