import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import {
  absoluteUrl,
  buildWebAppJsonLd,
  buildWebsiteJsonLd,
  defaultKeywords,
  pages,
  siteConfig,
} from "@/lib/seo";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: pages.home.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: pages.home.description,
  keywords: defaultKeywords,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "psychology",
  alternates: {
    canonical: pages.home.path,
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: pages.home.title,
    description: pages.home.description,
    images: [
      {
        url: absoluteUrl("/tc-logo-full.svg"),
        width: 109,
        height: 34,
        alt: "Teamconstructor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pages.home.title,
    description: pages.home.description,
    images: [absoluteUrl("/tc-logo-full.svg")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "ai-description": pages.home.description,
    "llms-txt": absoluteUrl("/llms.txt"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${openSans.variable} antialiased`}>
        <JsonLd data={[buildWebsiteJsonLd(), buildWebAppJsonLd()]} />
        <div className="app-shell">
          <Header />
          <main className="app-main">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
