"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { METRIKA_COUNTER_ID, METRIKA_ENABLED } from "@/lib/analytics";

declare global {
  interface Window {
    ym?: (id: number | string, method: string, ...args: unknown[]) => void;
  }
}

export function YandexMetrika() {
  const pathname = usePathname();
  const isFirstHit = useRef(true);

  useEffect(() => {
    if (!METRIKA_ENABLED || typeof window.ym !== "function") return;
    if (isFirstHit.current) {
      isFirstHit.current = false;
      return;
    }
    window.ym(METRIKA_COUNTER_ID, "hit", window.location.href);
  }, [pathname]);

  if (!METRIKA_ENABLED) {
    return null;
  }

  const id = METRIKA_COUNTER_ID;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {
              if (document.scripts[j].src === r) { return; }
            }
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=${id}', 'ym');
          ym(${JSON.stringify(id)}, 'init', {
            ssr: true,
            webvisor: true,
            clickmap: true,
            ecommerce: 'dataLayer',
            referrer: document.referrer,
            url: location.href,
            accurateTrackBounce: true,
            trackLinks: true
          });
        `}
      </Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${id}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
