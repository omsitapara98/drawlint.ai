import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support & FAQ — DrawLint.ai",
  description: "Get help with DrawLint.ai — frequently asked questions about AI reviews, providers, scoring, and account management.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
