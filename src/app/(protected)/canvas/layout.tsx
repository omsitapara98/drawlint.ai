import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design Canvas — DrawLint.ai",
  description: "Draw your system architecture on the canvas and submit for AI-powered review from 6 specialized reviewers.",
};

export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
