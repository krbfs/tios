export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-G5TG1F8M5N";

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
