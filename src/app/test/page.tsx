import { redirect } from "next/navigation";
import { buildPageMetadata, pages } from "@/lib/seo";

export const metadata = buildPageMetadata(pages.testIntro);

export default function TestRedirectPage() {
  redirect("/test/start.html");
}
