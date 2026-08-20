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
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #17255a 0%, #1a54d8 55%, #5b8df7 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 600, opacity: 0.9 }}>
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
    ),
    { ...size },
  );
}
