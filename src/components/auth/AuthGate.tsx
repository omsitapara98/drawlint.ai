"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const DISMISS_KEY = "drawlint:auth-gate-dismissed";

export default function AuthGate() {
  const { status } = useSession();
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  if (status === "authenticated" || status === "loading" || dismissed) {
    return null;
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border bg-background p-8 shadow-2xl text-center space-y-6">
        <div className="space-y-2">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-lg font-bold shadow-lg">
              D
            </div>
          </div>
          <h2 className="text-lg font-semibold">
            Sign in to save your designs
          </h2>
          <p className="text-sm text-muted-foreground">
            Create an account to save diagrams, track review history, and unlock
            more features.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/signin"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-muted dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Sign in with Email
          </Link>

          <Button
            className="h-10 w-full gap-2 bg-white text-black border hover:bg-gray-50 dark:bg-white dark:text-black dark:hover:bg-gray-100"
            onClick={() => signIn("google", { callbackUrl: "/canvas" })}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <Button
            className="h-10 w-full gap-2 bg-[#24292f] text-white hover:bg-[#1b1f23] dark:bg-[#24292f] dark:hover:bg-[#1b1f23]"
            onClick={() => signIn("github", { callbackUrl: "/canvas" })}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Continue with GitHub
          </Button>
        </div>

        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
