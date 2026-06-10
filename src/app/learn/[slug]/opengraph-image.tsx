import { ImageResponse } from "next/og";
import { getLesson, getModule, allLessonSlugs } from "@/app/learn/_content/registry";

export const alt = "System Design Workbook — DrawLint.ai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return allLessonSlugs().map((slug) => ({ slug }));
}

export default async function LessonOGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  const mod = lesson ? getModule(lesson.module) : undefined;
  const title = lesson?.title ?? "System Design Workbook";
  const eyebrow = mod ? `${mod.emoji}  ${mod.title}` : "System Design Workbook";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #1a1025 50%, #0a0a0a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-5%",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)",
          }}
        />

        {/* Top: brand + module */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                fontSize: 28,
                fontWeight: 800,
                color: "white",
              }}
            >
              D
            </div>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: "white" }}>
              DrawLint.ai
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 600,
              color: "#a78bfa",
            }}
          >
            {eyebrow}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 900,
            lineHeight: 1.05,
            color: "white",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 22, color: "#a1a1aa" }}>
            System Design Workbook · beginner-friendly
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#52525b" }}>
            drawlint-ai.in/learn
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
