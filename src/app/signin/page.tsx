"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "An account with this email already exists. Sign in with your email and password instead.",
  OAuthCallbackError: "Sign-in failed. Please try again.",
  CredentialsSignin: "Invalid email or password.",
  SessionRequired: "Please sign in to continue.",
  Default: "Something went wrong. Please try again.",
};

function SignInContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const rawCallback = searchParams.get("callbackUrl");
  const callbackUrl = rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/canvas";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const displayError =
    formError ||
    (urlError
      ? (AUTH_ERROR_MESSAGES[urlError] ?? AUTH_ERROR_MESSAGES.Default)
      : "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!email || !password) {
      setFormError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError("Invalid email or password");
        setLoading(false);
        return;
      }

      window.location.href = callbackUrl;
    } catch {
      setFormError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-500/10 via-background to-cyan-500/5 dark:from-violet-500/15 dark:via-background dark:to-cyan-500/8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-8 text-center rounded-2xl border border-border/50 dark:border-white/[0.08] bg-card/80 dark:bg-card/60 backdrop-blur-xl p-8 shadow-xl dark:shadow-[0_0_40px_oklch(0_0_0_/_30%)]"
      >
        {/* Logo */}
        <Link href="/" className="inline-flex flex-col items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-2xl font-bold shadow-lg shadow-violet-500/25 shadow-[0_0_20px_oklch(0.72_0.25_285_/_30%)]">
            D
          </div>
          <span className="text-xl font-bold tracking-tight">
            DrawLint<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">.ai</span>
          </span>
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to save your designs and review history
          </p>
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border bg-card/50 dark:bg-white/5 backdrop-blur-sm border-border/50 dark:border-white/[0.08] focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_12px_oklch(0.72_0.25_285_/_15%)] px-3 py-2 text-sm outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full rounded-md border bg-card/50 dark:bg-white/5 backdrop-blur-sm border-border/50 dark:border-white/[0.08] focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_12px_oklch(0.72_0.25_285_/_15%)] px-3 py-2 text-sm outline-none transition-all"
            />
          </div>

          {displayError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-destructive"
            >
              {displayError}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-[0_0_20px_oklch(0.72_0.25_285_/_20%)] hover:shadow-[0_0_30px_oklch(0.72_0.25_285_/_35%)]"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full bg-gradient-to-r from-transparent via-border to-transparent h-px" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card/80 dark:bg-card/60 px-2 text-muted-foreground">
              or continue with
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border/50 dark:border-white/[0.08] bg-card/50 dark:bg-white/5 backdrop-blur-sm text-sm font-medium transition-colors hover:border-primary/30"
          >
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
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
            Sign in with Google
          </button>

          <button
            onClick={() => signIn("github", { callbackUrl })}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border/50 dark:border-white/[0.08] bg-[#24292f] text-sm font-medium text-white transition-all hover:bg-[#1b1f23] hover:shadow-[0_0_12px_oklch(0.72_0.25_285_/_15%)]"
          >
            <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-500/10 via-background to-cyan-500/5 dark:from-violet-500/15 dark:via-background dark:to-cyan-500/8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
