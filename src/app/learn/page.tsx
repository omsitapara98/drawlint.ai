import type { Metadata } from "next";
import { LearnHub } from "@/components/learn/LearnHub";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://drawlint-ai.in";

const DESCRIPTION =
  "A free, beginner-friendly system design workbook. Learn fundamentals like latency, throughput, CAP theorem, consistency, scaling, load balancing, caching, and capacity estimation — with clear examples and analogies.";

export const metadata: Metadata = {
  title: "System Design Workbook — Learn System Design from Scratch | DrawLint.ai",
  description: DESCRIPTION,
  alternates: { canonical: "/learn" },
  openGraph: {
    type: "website",
    url: "/learn",
    siteName: "DrawLint.ai",
    title: "System Design Workbook — Learn System Design from Scratch",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "System Design Workbook — Learn System Design from Scratch",
    description: DESCRIPTION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "System Design Workbook",
  description: DESCRIPTION,
  url: `${APP_URL}/learn`,
  inLanguage: "en",
  isAccessibleForFree: true,
  provider: {
    "@type": "Organization",
    name: "DrawLint.ai",
    url: APP_URL,
  },
};

export default function LearnPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LearnHub />
    </>
  );
}
