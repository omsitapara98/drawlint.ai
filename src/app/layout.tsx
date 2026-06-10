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

const APP_DESCRIPTION =
  "Practice system design like you practice algorithms. Submit diagrams for instant AI feedback from 6 specialized reviewers — plus a free learn workbook, a 27-pattern cheatsheet, daily MCQ drills, weekly challenges, leaderboards, and streaks.";

export const metadata: Metadata = {
  title: "DrawLint.ai — The System Design Practice Platform",
  description: APP_DESCRIPTION,
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
    "learn system design",
    "system design workbook",
    "system design patterns",
    "system design cheatsheet",
    "daily drills",
    "system design quiz",
    "system design mcq",
  ],
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
  },
  authors: [{ name: "DrawLint.ai" }],
  creator: "DrawLint.ai",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "DrawLint.ai",
    title: "DrawLint.ai — The System Design Practice Platform",
    description: APP_DESCRIPTION,
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
    description: APP_DESCRIPTION,
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
              description: APP_DESCRIPTION,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              featureList: [
                "AI system design review from 6 specialized reviewers",
                "Free learn workbook (Fundamentals, Building Blocks, 27 Design Patterns)",
                "System design pattern cheatsheet",
                "Daily MCQ drills with leaderboards and streaks",
                "Weekly system design challenges",
                "Public library of community solutions",
              ],
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
