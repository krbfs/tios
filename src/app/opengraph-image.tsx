import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo";

export const runtime = "edge";
export const alt = "TIOS — тест ТИОС, управленческий психотип за 10 минут";
export const size = {
  width: siteConfig.ogImageWidth,
  height: siteConfig.ogImageHeight,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #17255a 0%, #1a54d8 52%, #5b8df7 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -80,
            top: -40,
            width: 420,
            height: 420,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 300,
              height: 300,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 180,
                height: 180,
                background: "rgba(234,179,8,0.92)",
                clipPath:
                  "polygon(50% 8%, 82% 32%, 72% 72%, 28% 72%, 18% 32%)",
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
            width: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, fontWeight: 600, opacity: 0.95 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "#17255a",
                border: "2px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#eab308",
                }}
              />
            </div>
            TIOS · тест ТИОС
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                display: "flex",
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1.15,
                maxWidth: 980,
              }}
            >
              Управленческий психотип за 10 минут
            </div>
            <div style={{ display: "flex", fontSize: 30, opacity: 0.92, maxWidth: 900 }}>
              75 вопросов · бесплатно · без обязательной регистрации
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 24,
              opacity: 0.9,
            }}
          >
            <span>tios-test.com/test</span>
            <span>Insighter partner</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
