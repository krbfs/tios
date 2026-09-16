"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { DEMO_RESULT_HREF } from "@/lib/demo-links";

const TOKEN_KEY = "tc26_access_token";
const USER_KEY = "tc26_user";

type StoredUser = {
  email?: string;
};

function readStoredUser(): StoredUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!localStorage.getItem(TOKEN_KEY)) {
    return null;
  }
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

/** Keep in sync with chrome/header-public.html */
const NAV_ITEMS: Array<{ href: string; label: string; gaEvent?: string }> = [
  { href: "/test", label: "Пройти тест", gaEvent: "cta_header_start_test" },
  { href: DEMO_RESULT_HREF, label: "Пример результата", gaEvent: "cta_header_demo_result" },
  { href: "/about", label: "О тесте", gaEvent: "cta_header_about" },
  { href: "/where-used", label: "Где используется", gaEvent: "cta_header_where_used" },
  { href: "/author", label: "Об авторе", gaEvent: "cta_header_author" },
  { href: "/contact", label: "Контакты", gaEvent: "cta_header_contact" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null);
  const [returnTo, setReturnTo] = useState("/cabinet.html");

  useEffect(() => {
    const syncAuth = () => setStoredUser(readStoredUser());
    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("tc26-auth-change", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("tc26-auth-change", syncAuth);
    };
  }, []);

  useEffect(() => {
    setReturnTo(`${window.location.pathname}${window.location.search}`);
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isLoggedIn = Boolean(storedUser);
  const loginHref = `/login.html?next=${encodeURIComponent(returnTo)}`;
  const cabinetHref = "/cabinet.html";
  const cabinetLabel = storedUser?.email
    ? `Кабинет (${storedUser.email})`
    : "Личный кабинет";

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
      className="shrink-0 whitespace-nowrap text-[0.875rem] font-normal text-foreground hover:text-primary lg:text-[0.9375rem]"
      data-ga-event={item.gaEvent}
      onClick={() => setOpen(false)}
    >
      {item.label}
    </Link>
  ));

  return (
    <header className={`site-header z-40 border-0 border-b border-solid border-border bg-white ${open ? "site-header--open" : ""}`}>
      <div className="container-page flex min-h-16 items-center gap-4 py-2 lg:py-0">
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
          className="site-header-menu site-header-menu--desktop hidden min-w-0 flex-nowrap items-center gap-x-3 lg:ml-2 lg:flex lg:gap-x-4"
          aria-label="Основное меню"
        >
          {navLinks}
        </nav>

        <div className="site-header-spacer ml-auto lg:ml-0 lg:flex-1" />

        {isLoggedIn ? (
          <Link
            href={cabinetHref}
            className="btn btn-outline site-header-login site-header-login--desktop hidden lg:inline-flex"
            data-ga-event="cta_header_cabinet"
          >
            {cabinetLabel}
          </Link>
        ) : (
          <Link
            href={loginHref}
            className="btn btn-outline site-header-login site-header-login--desktop hidden lg:inline-flex"
            data-ga-event="cta_header_login"
          >
            Войти
          </Link>
        )}

        <button
          type="button"
          className="site-header-burger lg:hidden"
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
        className="site-header-drawer lg:hidden"
        hidden={!open}
      >
        <div className="container-page pb-4">
          <nav
            className="site-header-menu site-header-menu--drawer flex flex-col"
            aria-label="Основное меню"
          >
            {navLinks}
            {isLoggedIn ? (
              <Link
                href={cabinetHref}
                className="site-header-login text-[0.9375rem] font-normal text-foreground hover:text-primary"
                data-ga-event="cta_header_cabinet"
                onClick={() => setOpen(false)}
              >
                {cabinetLabel}
              </Link>
            ) : (
              <Link
                href={loginHref}
                className="site-header-login text-[0.9375rem] font-normal text-foreground hover:text-primary"
                data-ga-event="cta_header_login"
                onClick={() => setOpen(false)}
              >
                Войти
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
