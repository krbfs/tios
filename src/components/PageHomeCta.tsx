"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PageHomeCta() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/test" || pathname.startsWith("/test/")) {
    return null;
  }

  return (
    <div className="page-home-cta container-page mx-auto text-center">
      <Link href="/" className="btn btn-outline" data-ga-event="cta_page_home">
        На главную
      </Link>
    </div>
  );
}
