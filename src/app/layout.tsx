import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";
import SessionProvider from "@/components/providers/SessionProvider";
import { ScrollProgress } from "@/components/ui/scroll-progress";
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://drawlint-ai.azurewebsites.net";

export const metadata: Metadata = {
  title: "DrawLint.ai — AI-Powered System Design Review",
  description:
    "Draw system design diagrams and get instant AI feedback from 6 specialized reviewers. Practice for system design interviews with real-time architecture analysis.",
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
  ],
  authors: [{ name: "DrawLint.ai" }],
  creator: "DrawLint.ai",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "DrawLint.ai",
    title: "DrawLint.ai — AI-Powered System Design Review",
    description:
      "Draw your architecture, get instant review from 6 AI reviewers. Practice system design interviews with real-time feedback.",
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
    title: "DrawLint.ai — AI-Powered System Design Review",
    description:
      "Draw your architecture, get instant review from 6 AI reviewers. Free to start.",
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
      <body className="h-full" suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" storageKey="drawlint-theme" enableSystem={false} disableTransitionOnChange>
            <ScrollProgress />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
