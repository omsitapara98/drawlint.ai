import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — DrawLint.ai",
  description: "DrawLint.ai is an open-source, AI-powered system design review platform built for engineers practicing for interviews.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
