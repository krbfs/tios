/** Google Analytics 4 (gtag) — init and event helpers. */

const DEFAULT_MEASUREMENT_ID = "G-G5TG1F8M5N";

let initialized = false;

function readMeasurementId() {
  const meta = document.querySelector('meta[name="ga-measurement-id"]');
  const fromMeta = meta?.getAttribute("content")?.trim();
  return fromMeta || DEFAULT_MEASUREMENT_ID;
}

export function initGoogleAnalytics(measurementId = readMeasurementId()) {
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
