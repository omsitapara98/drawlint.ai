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

export const metadata: Metadata = {
  title: "DrawLint.ai — AI-Powered System Design Review",
  description:
    "Draw system design diagrams and get instant AI feedback on architecture, scalability, and best practices.",
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
