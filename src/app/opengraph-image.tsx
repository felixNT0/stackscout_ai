import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B1120",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #7047EB 0%, #18B8D8 100%)",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 64 64" fill="none">
              <rect x="10" y="16" width="44" height="32" rx="5" stroke="white" strokeWidth="5" />
              <path d="M22 16v-4a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v4" stroke="white" strokeWidth="5" />
              <path d="M10 28h44" stroke="white" strokeWidth="5" />
              <circle cx="32" cy="44" r="4" fill="white" />
            </svg>
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#F5F7FC" }}>
            {site.name}
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#F5F7FC",
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            Discover the right opportunity.
          </div>
          <div style={{ fontSize: 36, color: "#9AA7C7", lineHeight: 1.3, maxWidth: 900 }}>
            Let AI find your next career move.
          </div>
        </div>

        {/* Footer strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            color: "#7047EB",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: "#18B8D8",
            }}
          />
          AI resume intelligence · Multi-source job discovery · Smart matching
        </div>
      </div>
    ),
    size,
  );
}
