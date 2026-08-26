import type { MetadataRoute } from "next";
import { pages, siteConfig, type PageSeo } from "@/lib/seo";

/** Indexable public URLs beyond `pages` (static HTML with index,follow). */
const EXTRA_INDEXABLE: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  {
    path: "/privacy.html",
    changeFrequency: "yearly",
    priority: 0.3,
  },
];

const PAGE_META: Record<
  string,
  {
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }
> = {
  "/": { changeFrequency: "weekly", priority: 1 },
  "/about": { changeFrequency: "monthly", priority: 0.85 },
  "/author": { changeFrequency: "yearly", priority: 0.6 },
  "/contact": { changeFrequency: "yearly", priority: 0.5 },
  "/test": { changeFrequency: "weekly", priority: 0.9 },
  "/test/take": { changeFrequency: "weekly", priority: 0.95 },
  "/results": { changeFrequency: "monthly", priority: 0.7 },
};

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const fromPages = (Object.values(pages) as PageSeo[])
    .filter((page) => page.robots?.index !== false)
    .map((page) => {
      const meta = PAGE_META[page.path] ?? {
        changeFrequency: "monthly" as const,
        priority: 0.5,
      };
      return {
        url: `${siteConfig.url}${page.path}`,
        lastModified: now,
        changeFrequency: meta.changeFrequency,
        priority: meta.priority,
      };
    });

  const extras = EXTRA_INDEXABLE.map((item) => ({
    url: `${siteConfig.url}${item.path}`,
    lastModified: now,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  return [...fromPages, ...extras];
}
