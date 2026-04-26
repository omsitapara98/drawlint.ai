import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password — DrawLint.ai",
  description: "Set a new password for your DrawLint.ai account.",
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
