/** Google Analytics 4 + Yandex.Metrika — init and event helpers. */

const DEFAULT_MEASUREMENT_ID = "G-TYYGE7DS6E";
const DEFAULT_METRIKA_ID = "111930448";

let gaInitialized = false;
let metrikaInitialized = false;

function readMetaMeasurementId() {
  const meta = document.querySelector('meta[name="ga-measurement-id"]');
  return meta?.getAttribute("content")?.trim() || "";
}

function readMetaMetrikaId() {
  const meta = document.querySelector('meta[name="yandex-metrika-id"]');
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
  if (gaInitialized || !measurementId || typeof window === "undefined") {
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

  gaInitialized = true;
}

export function initYandexMetrika(counterId) {
  if (metrikaInitialized || !counterId || typeof window === "undefined") {
    return;
  }

  const scriptUrl = `https://mc.yandex.ru/metrika/tag.js?id=${encodeURIComponent(counterId)}`;

  (function (m, e, t, r, i, k, a) {
    m[i] =
      m[i] ||
      function () {
        (m[i].a = m[i].a || []).push(arguments);
      };
    m[i].l = 1 * new Date();
    for (let j = 0; j < document.scripts.length; j++) {
      if (document.scripts[j].src === r) {
        return;
      }
    }
    k = e.createElement(t);
    a = e.getElementsByTagName(t)[0];
    k.async = 1;
    k.src = r;
    a.parentNode.insertBefore(k, a);
  })(window, document, "script", scriptUrl, "ym");

  window.ym(counterId, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });

  if (!document.getElementById("yandex-metrika-noscript")) {
    const noscript = document.createElement("noscript");
    noscript.id = "yandex-metrika-noscript";
    noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${counterId}" style="position:absolute; left:-9999px;" alt="" /></div>`;
    document.body.appendChild(noscript);
  }

  metrikaInitialized = true;
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
  if (config?.gaEnabled !== false) {
    const measurementId =
      config?.gaMeasurementId ||
      readMetaMeasurementId() ||
      DEFAULT_MEASUREMENT_ID;
    initGoogleAnalytics(measurementId);
  }

  if (config?.metrikaEnabled !== false) {
    const counterId =
      config?.metrikaCounterId ||
      readMetaMetrikaId() ||
      DEFAULT_METRIKA_ID;
    initYandexMetrika(counterId);
  }

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
