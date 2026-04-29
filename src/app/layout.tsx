import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";
import SessionProvider from "@/components/providers/SessionProvider";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { CookieBanner } from "@/components/ui/cookie-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://drawlint-ai.in";

export const metadata: Metadata = {
  title: "DrawLint.ai — The System Design Practice Platform",
  description:
    "Submit system design diagrams and get instant AI feedback from 6 specialized reviewers. Weekly challenges, leaderboards, streaks, and a public library of solutions. Practice system design like you practice algorithms.",
  metadataBase: new URL(APP_URL),
  keywords: [
    "system design",
    "architecture review",
    "AI review",
    "system design interview",
    "whiteboard",
    "excalidraw",
    "design review",
    "scalability",
    "HLD",
    "low level design",
    "weekly challenge",
    "system design practice",
  ],
  authors: [{ name: "DrawLint.ai" }],
  creator: "DrawLint.ai",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "DrawLint.ai",
    title: "DrawLint.ai — The System Design Practice Platform",
    description:
      "Submit system design diagrams and get instant AI feedback from 6 specialized reviewers. Weekly challenges, leaderboards, streaks, and a public library of solutions. Practice system design like you practice algorithms.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "DrawLint.ai — AI-Powered System Design Review",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DrawLint.ai — The System Design Practice Platform",
    description:
      "Submit system design diagrams and get instant AI feedback from 6 specialized reviewers. Weekly challenges, leaderboards, streaks, and a public library of solutions. Practice system design like you practice algorithms.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "DrawLint.ai",
              url: APP_URL,
              description: "AI-powered system design review platform. Draw architecture diagrams and get instant feedback from 6 specialized AI reviewers.",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body className="h-full" suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" storageKey="drawlint-theme" enableSystem={false} disableTransitionOnChange>
            <ScrollProgress />
            {children}
            <CookieBanner />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
