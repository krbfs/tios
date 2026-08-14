"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Keep in sync with chrome/header-public.html */
const NAV_ITEMS: Array<{ href: string; label: string; gaEvent?: string }> = [
  { href: "/", label: "Главная" },
  { href: "/test", label: "Пройти тест", gaEvent: "cta_header_start_test" },
  { href: "/cabinet", label: "Личный кабинет", gaEvent: "cta_header_cabinet" },
];

export function Header() {
  const pathname = usePathname();
  const loginHref =
    pathname === "/login" ? "/" : `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="z-40 border-0 border-b border-solid border-border bg-white">
      <div className="container-page flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 py-2 md:flex-nowrap md:py-0">
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

        <nav
          className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-2 border-t border-solid border-border pt-2 md:order-none md:ml-2 md:w-auto md:border-0 md:pt-0"
          aria-label="Основное меню"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[0.9375rem] font-semibold text-foreground hover:text-primary"
              data-ga-event={item.gaEvent}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto">
          <Link href={loginHref} className="btn btn-outline" data-ga-event="cta_header_login">
            Войти
          </Link>
        </div>
      </div>
    </header>
  );
}
