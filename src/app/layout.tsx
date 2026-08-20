import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import {
  absoluteUrl,
  buildOrganizationJsonLd,
  buildProductOffersJsonLd,
  buildWebAppJsonLd,
  buildWebsiteJsonLd,
  defaultKeywords,
  ogImageMeta,
  pages,
  siteConfig,
} from "@/lib/seo";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin", "cyrillic"],
});

const ogImage = ogImageMeta();

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
    types: {
      "text/plain": [
        { url: absoluteUrl("/llms.txt"), title: "llms.txt" },
        { url: absoluteUrl("/llms-full.txt"), title: "llms-full.txt" },
      ],
    },
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: pages.home.title,
    description: pages.home.description,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: pages.home.title,
    description: pages.home.description,
    images: [ogImage.url],
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
    "llms-full-txt": absoluteUrl("/llms-full.txt"),
    "ai-txt": absoluteUrl("/ai.txt"),
    "a2a-agent-card": absoluteUrl("/.well-known/agent-card.json"),
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
        <GoogleAnalytics />
        <JsonLd
          data={[
            buildWebsiteJsonLd(),
            buildOrganizationJsonLd(),
            buildWebAppJsonLd(),
            buildProductOffersJsonLd(),
          ]}
        />
        <div className="app-shell">
          <Header />
          <main className="app-main">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
