"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Keep in sync with chrome/header-public.html */
const NAV_ITEMS: Array<{ href: string; label: string; gaEvent?: string }> = [
  { href: "/test", label: "Пройти тест", gaEvent: "cta_header_start_test" },
  { href: "/results", label: "Пример результата", gaEvent: "cta_header_demo_result" },
  { href: "/about", label: "О тесте", gaEvent: "cta_header_about" },
  { href: "/author", label: "Об авторе", gaEvent: "cta_header_author" },
  { href: "/contact", label: "Свяжитесь с нами", gaEvent: "cta_header_contact" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const loginHref =
    pathname === "/login" ? "/" : `/login?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const navLinks = NAV_ITEMS.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      className="text-[0.9375rem] font-normal text-foreground hover:text-primary"
      data-ga-event={item.gaEvent}
      onClick={() => setOpen(false)}
    >
      {item.label}
    </Link>
  ));

  return (
    <header className={`site-header z-40 border-0 border-b border-solid border-border bg-white ${open ? "site-header--open" : ""}`}>
      <div className="container-page flex min-h-16 items-center gap-4 py-2 md:py-0">
        <Link href="/" className="inline-flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="TIOS"
            width={108}
            height={34}
            className="block h-[34px] w-auto"
            src="/tc-logo-full.svg"
          />
        </Link>

        <nav
          className="site-header-menu site-header-menu--desktop hidden items-center gap-x-5 md:ml-2 md:flex"
          aria-label="Основное меню"
        >
          {navLinks}
        </nav>

        <div className="site-header-spacer ml-auto md:ml-0 md:flex-1" />

        <Link
          href={loginHref}
          className="btn btn-outline site-header-login site-header-login--desktop hidden md:inline-flex"
          data-ga-event="cta_header_login"
        >
          Войти
        </Link>

        <button
          type="button"
          className="site-header-burger md:hidden"
          aria-expanded={open}
          aria-controls="site-header-drawer"
          aria-label={open ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="site-header-burger-bar" aria-hidden="true" />
          <span className="site-header-burger-bar" aria-hidden="true" />
          <span className="site-header-burger-bar" aria-hidden="true" />
        </button>
      </div>

      <div
        id="site-header-drawer"
        className="site-header-drawer md:hidden"
        hidden={!open}
      >
        <div className="container-page pb-4">
          <nav
            className="site-header-menu site-header-menu--drawer flex flex-col"
            aria-label="Основное меню"
          >
            {navLinks}
            <Link
              href={loginHref}
              className="site-header-login text-[0.9375rem] font-normal text-foreground hover:text-primary"
              data-ga-event="cta_header_login"
              onClick={() => setOpen(false)}
            >
              Войти
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
