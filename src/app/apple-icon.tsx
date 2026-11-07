import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7047EB 0%, #18B8D8 100%)",
          borderRadius: 40,
        }}
      >
        <svg width="110" height="110" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="14" width="48" height="36" rx="6" stroke="white" strokeWidth="5" />
          <path d="M20 14v-5a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v5" stroke="white" strokeWidth="5" />
          <path d="M8 26h48" stroke="white" strokeWidth="5" />
          <circle cx="32" cy="44" r="4" fill="white" />
        </svg>
      </div>
    ),
    size,
  );
}
