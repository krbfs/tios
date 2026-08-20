import { buildPageMetadata, pages } from "@/lib/seo";

export const metadata = buildPageMetadata(pages.login);

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
