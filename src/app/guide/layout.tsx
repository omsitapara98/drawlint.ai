import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drawing Guide — DrawLint.ai",
  description: "Learn how to draw effective system design diagrams for AI review. Templates, components, data flows, annotations, and best practices.",
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
