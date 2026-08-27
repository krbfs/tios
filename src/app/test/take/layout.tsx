import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbJsonLd, buildPageMetadata, pages } from "@/lib/seo";

export const metadata = buildPageMetadata(pages.testTake);

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
          { name: "Пройти тест ТИОС", path: "/test/take" },
        ])}
      />
    </>
  );
}
