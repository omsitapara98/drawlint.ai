import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Setup Guide — DrawLint.ai",
  description: "Connect your own AI provider — Gemini (free) or Azure OpenAI (advanced) — for unlimited system design reviews.",
};

export default function BYOKeysLayout({ children }: { children: React.ReactNode }) {
  return children;
}
