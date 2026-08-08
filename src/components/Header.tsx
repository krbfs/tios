"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const loginHref = pathname === "/login" ? "/" : `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky top-0 z-40 border-0 border-b border-solid border-border bg-white">
      <div className="container-page flex items-center justify-between py-4 px-3">
        <Link href="/" className="inline-block" aria-label="Teamconstructor">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tc-logo-full.svg"
            alt="Teamconstructor"
            width={140}
            height={44}
          />
        </Link>
        <Link href={loginHref} className="btn btn-primary">
          Войти
        </Link>
      </div>
    </header>
  );
}
