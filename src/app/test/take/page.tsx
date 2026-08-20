import { redirect } from "next/navigation";
import { buildPageMetadata, pages } from "@/lib/seo";

export const metadata = buildPageMetadata(pages.testTake);

export default function TestTakeRedirectPage() {
  redirect("/test/take.html");
}
