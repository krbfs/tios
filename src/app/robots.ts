import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/login", "/admin", "/cabinet.html"],
      },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Bytespider", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "meta-externalagent", allow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
