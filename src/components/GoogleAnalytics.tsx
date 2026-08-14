"use client";

import Script from "next/script";
import { useEffect } from "react";
import { bindGaClickTracking, GA_ENABLED, GA_MEASUREMENT_ID } from "@/lib/analytics";

export function GoogleAnalytics() {
  useEffect(() => {
    if (!GA_ENABLED) return;
    bindGaClickTracking();
  }, []);

  if (!GA_ENABLED) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
