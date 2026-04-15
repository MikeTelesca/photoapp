import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ATH AI Photo Editor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 800, marginBottom: 16 }}>ATH</div>
        <div style={{ fontSize: 48, fontWeight: 600, marginBottom: 8 }}>AI Photo Editor</div>
        <div style={{ fontSize: 24, opacity: 0.9 }}>For real estate photographers</div>
      </div>
    ),
    { ...size }
  );
}
