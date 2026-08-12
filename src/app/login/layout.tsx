import type { Metadata } from "next";
import { pages } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: pages.login.title },
  description: pages.login.description,
  alternates: { canonical: pages.login.path },
  robots: pages.login.robots,
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
