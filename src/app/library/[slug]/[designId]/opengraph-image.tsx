import { ImageResponse } from "next/og";
import { ObjectId } from "mongodb";
import { getDesignById } from "@/lib/db/designs";
import { getReviewByDesignId } from "@/lib/db/reviews";
import { getTopicBySlug } from "@/lib/db/topics";
import clientPromise from "@/lib/db/mongodb";

export const alt = "System Design Review — DrawLint.ai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DB_NAME = "drawlint-db";

const SIGNAL_LABELS: Record<string, string> = {
  "strong-hire": "Strong Hire",
  hire: "Hire",
  "lean-hire": "Lean Hire",
  "lean-no-hire": "Lean No Hire",
  "no-hire": "No Hire",
};

const SIGNAL_COLORS: Record<string, string> = {
  "strong-hire": "#10b981",
  hire: "#34d399",
  "lean-hire": "#a3e635",
  "lean-no-hire": "#f59e0b",
  "no-hire": "#ef4444",
};

export default async function DesignOGImage({
  params,
}: {
  params: Promise<{ slug: string; designId: string }>;
}) {
  const { slug, designId } = await params;

  let topicName = "System Design";
  let authorName = "Anonymous";
  let signalKey: string | null = null;

  try {
    const [topic, design] = await Promise.all([
      getTopicBySlug(slug),
      getDesignById(designId).catch(() => null),
    ]);
    if (topic) topicName = topic.name;
    if (design && design.status !== "draft") {
      const review = await getReviewByDesignId(designId);
      signalKey = review?.leadReviewer?.signal ?? null;
      if (design.anonymousName) {
        authorName = design.anonymousName;
      } else {
        const client = await clientPromise;
        const author = await client
          .db(DB_NAME)
          .collection("users")
          .findOne({ _id: new ObjectId(design.userId) }, { projection: { name: 1 } });
        authorName = (author?.name as string) ?? "Anonymous";
      }
    }
  } catch {
    /* fall back to defaults */
  }

  const signalLabel = signalKey ? SIGNAL_LABELS[signalKey] ?? null : null;
  const signalColor = signalKey ? SIGNAL_COLORS[signalKey] ?? "#a78bfa" : "#a78bfa";

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

        {/* Top: brand */}
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
          <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: "#a78bfa" }}>
            System Design Review
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 900,
            lineHeight: 1.05,
            color: "white",
            maxWidth: 1000,
          }}
        >
          {topicName}
        </div>

        {/* Bottom: author + signal */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 24, color: "#a1a1aa" }}>
            by {authorName} · 6 AI reviewers
          </div>
          {signalLabel && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 22px",
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 700,
                color: signalColor,
                border: `2px solid ${signalColor}`,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {signalLabel}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
