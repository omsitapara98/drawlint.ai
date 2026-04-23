"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";

export default function SignInButton() {
  return (
    <Link
      href="/signin"
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/50 dark:border-white/[0.08] bg-card/50 dark:bg-white/5 backdrop-blur-sm px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:shadow-[0_0_12px_oklch(0.72_0.25_285_/_15%)] hover:text-foreground"
    >
      <LogIn className="h-3.5 w-3.5" />
      Sign In
    </Link>
  );
}
