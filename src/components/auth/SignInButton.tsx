"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";

export default function SignInButton() {
  return (
    <Link
      href="/signin"
      className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <LogIn className="h-3.5 w-3.5" />
      Sign In
    </Link>
  );
}
