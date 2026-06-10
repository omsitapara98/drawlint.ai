import type { Metadata } from "next";

const DESCRIPTION =
  "Comprehensive system design interview patterns reference. 27 production-ready patterns across storage, scalability, reliability, async processing, communication, and data modeling. Searchable, filterable, interview-ready.";

export const metadata: Metadata = {
  title: "System Design Cheatsheet — DrawLint.ai",
  description: DESCRIPTION,
  alternates: { canonical: "/learn/cheatsheet" },
  openGraph: {
    type: "website",
    url: "/learn/cheatsheet",
    siteName: "DrawLint.ai",
    title: "System Design Cheatsheet — DrawLint.ai",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "System Design Cheatsheet — DrawLint.ai",
    description: DESCRIPTION,
  },
};

export default function CheatsheetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
