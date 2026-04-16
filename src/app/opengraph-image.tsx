import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BatchBase — AI Photo Workflow";
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
        <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -3, marginBottom: 16 }}>
          <span style={{ color: "#ffffff" }}>Batch</span><span style={{ color: "#0D0D0F" }}>Base</span>
        </div>
        <div style={{ fontSize: 28, opacity: 0.9, letterSpacing: 4, textTransform: "uppercase" }}>AI Photo Workflow</div>
      </div>
    ),
    { ...size }
  );
}
