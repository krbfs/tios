import { gaConfig } from "./ga-config";
import { metrikaConfig } from "./metrika-config";

export { gaConfig, getPublicGaConfig, isGaDataApiConfigured } from "./ga-config";
export { metrikaConfig, getPublicMetrikaConfig } from "./metrika-config";

export const GA_MEASUREMENT_ID = gaConfig.measurementId;
export const GA_ENABLED = gaConfig.enabled;

export const METRIKA_COUNTER_ID = metrikaConfig.counterId;
export const METRIKA_ENABLED = metrikaConfig.enabled;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackGaEvent(
  eventName: string,
  params: Record<string, string | undefined> = {},
) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

export function bindGaClickTracking() {
  if (document.documentElement.dataset.gaBound === "true") {
    return;
  }

  document.documentElement.dataset.gaBound = "true";

  document.addEventListener(
    "click",
    (event) => {
      const target = (event.target as Element | null)?.closest("[data-ga-event]");
      if (!(target instanceof HTMLElement)) return;

      const eventName = target.dataset.gaEvent?.trim();
      if (!eventName) return;

      trackGaEvent(eventName, {
        event_category: "cta",
        link_url: target instanceof HTMLAnchorElement ? target.href : undefined,
        button_text: target.textContent?.trim() || "",
        page_path: window.location.pathname,
      });
    },
    true,
  );
}
