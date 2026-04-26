import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — DrawLint.ai",
  description: "Sign in to DrawLint.ai to save your system design diagrams and get AI-powered architecture reviews.",
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
