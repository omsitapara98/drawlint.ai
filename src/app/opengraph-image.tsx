import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DrawLint.ai — AI-Powered System Design Review";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1025 50%, #0a0a0a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            fontSize: 32,
            fontWeight: 800,
            color: "white",
            marginBottom: 24,
          }}
        >
          D
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 900,
            color: "white",
            marginBottom: 12,
          }}
        >
          DrawLint
          <span
            style={{
              background: "linear-gradient(90deg, #a78bfa, #67e8f9)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            .ai
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#a1a1aa",
            marginBottom: 40,
          }}
        >
          AI-Powered System Design Review
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
          {["6 AI Reviewers", "4 Review Levels", "Hire Signal", "Free to Start"].map(
            (text) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 24px",
                  borderRadius: 24,
                  border: "1px solid rgba(124,58,237,0.4)",
                  background: "rgba(124,58,237,0.1)",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#a78bfa",
                }}
              >
                {text}
              </div>
            ),
          )}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            color: "#71717a",
            textAlign: "center",
            maxWidth: 600,
          }}
        >
          Draw your architecture. Get instant AI feedback. Practice system design interviews.
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            fontSize: 16,
            color: "#52525b",
          }}
        >
          drawlint-ai.azurewebsites.net
        </div>
      </div>
    ),
    { ...size },
  );
}
