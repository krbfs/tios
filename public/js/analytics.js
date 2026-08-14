/** Google Analytics 4 — init and event helpers. */

const DEFAULT_MEASUREMENT_ID = "G-G5TG1F8M5N";

let initialized = false;

export function getMeasurementId() {
  const meta = document.querySelector('meta[name="ga-measurement-id"]');
  const fromMeta = meta?.getAttribute("content")?.trim();
  return fromMeta || DEFAULT_MEASUREMENT_ID;
}

export function initGoogleAnalytics(measurementId = getMeasurementId()) {
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

export function initSiteAnalytics() {
  initGoogleAnalytics();
  bindGaClickTracking();
}
