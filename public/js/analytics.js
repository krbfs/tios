/** Google Analytics 4 — init and event helpers. */

const DEFAULT_MEASUREMENT_ID = "G-TYYGE7DS6E";

let initialized = false;

function readMetaMeasurementId() {
  const meta = document.querySelector('meta[name="ga-measurement-id"]');
  return meta?.getAttribute("content")?.trim() || "";
}

async function loadPublicGaConfig() {
  try {
    const response = await fetch("/api/public-config");
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export function initGoogleAnalytics(measurementId) {
  if (initialized || !measurementId || typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  initialized = true;
}

export function trackGaEvent(eventName, params = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

export function bindGaClickTracking(root = document) {
  if (root.documentElement?.dataset.gaBound === "true") {
    return;
  }

  root.documentElement.dataset.gaBound = "true";

  root.addEventListener(
    "click",
    (event) => {
      const target = event.target.closest("[data-ga-event]");
      if (!target) return;

      const eventName = target.dataset.gaEvent?.trim();
      if (!eventName) return;

      trackGaEvent(eventName, {
        event_category: "cta",
        link_url: target.href || undefined,
        button_text: target.textContent?.trim() || "",
        page_path: window.location.pathname,
      });
    },
    true,
  );
}

export async function initSiteAnalytics() {
  const config = await loadPublicGaConfig();
  if (config?.gaEnabled === false) {
    return;
  }

  const measurementId =
    config?.gaMeasurementId ||
    readMetaMeasurementId() ||
    DEFAULT_MEASUREMENT_ID;

  initGoogleAnalytics(measurementId);
  bindGaClickTracking();
  initSiteHeader();
}

export function initSiteHeader() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  const burger = header.querySelector(".site-header-burger");
  const drawer = document.getElementById("site-header-drawer");
  if (!burger || !drawer) {
    return;
  }

  const close = () => {
    header.classList.remove("site-header--open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Открыть меню");
    drawer.hidden = true;
  };

  const open = () => {
    header.classList.add("site-header--open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Закрыть меню");
    drawer.hidden = false;
  };

  burger.addEventListener("click", () => {
    if (header.classList.contains("site-header--open")) {
      close();
      return;
    }
    open();
  });

  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", close);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });
}

/** @deprecated use initSiteAnalytics */
export function getMeasurementId() {
  return readMetaMeasurementId() || DEFAULT_MEASUREMENT_ID;
}
