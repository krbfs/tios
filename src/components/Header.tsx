"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const loginHref =
    pathname === "/login" ? "/" : `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="z-40 border-0 border-b border-solid border-border bg-white">
      <div className="container-page flex min-h-16 items-center justify-between py-0">
        <Link href="/" className="inline-flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="TC26"
            width={108}
            height={34}
            className="block h-[34px] w-auto"
            src="/tc-logo-full.svg"
          />
        </Link>
        <div>
          <Link href={loginHref} className="btn btn-outline" data-ga-event="cta_header_login">
            Войти
          </Link>
        </div>
      </div>
    </header>
  );
}
