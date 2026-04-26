import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up — DrawLint.ai",
  description: "Create a free DrawLint.ai account to practice system design with AI-powered reviews from 6 specialized reviewers.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
