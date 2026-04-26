"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-500/10 via-background to-cyan-500/5 dark:from-violet-500/15 dark:via-background dark:to-cyan-500/8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-6 text-center rounded-2xl border border-border/50 dark:border-white/[0.08] bg-card/80 dark:bg-card/60 backdrop-blur-xl p-8 shadow-xl"
      >
        <Link href="/" className="inline-flex flex-col items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-2xl font-bold shadow-lg shadow-violet-500/25">
            D
          </div>
          <span className="text-xl font-bold tracking-tight">
            DrawLint<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">.ai</span>
          </span>
        </Link>

        {sent ? (
          <div className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="text-2xl">✉️</span>
            </div>
            <h1 className="text-xl font-semibold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link. Check your spam folder too.
            </p>
            <Link
              href="/signin"
              className="inline-flex items-center text-sm text-violet-400 hover:underline"
            >
              ← Back to Sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Forgot password?</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

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
                  required
                  className="w-full rounded-md border bg-card/50 dark:bg-white/5 backdrop-blur-sm border-border/50 dark:border-white/[0.08] focus:border-primary/50 focus:ring-2 focus:ring-primary/20 px-3 py-2 text-sm outline-none transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <Link
              href="/signin"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Sign in
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
