"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-destructive">Invalid reset link. No token provided.</p>
        <Link href="/forgot-password" className="text-sm text-violet-400 hover:underline">
          Request a new reset link →
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <span className="text-2xl">✅</span>
        </div>
        <h1 className="text-xl font-semibold">Password reset!</h1>
        <p className="text-sm text-muted-foreground">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Link
          href="/signin"
          className="inline-flex items-center rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-6 h-10 text-sm font-medium text-white"
        >
          Sign In →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">New Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            className="w-full rounded-md border bg-card/50 dark:bg-white/5 border-border/50 dark:border-white/[0.08] focus:border-primary/50 focus:ring-2 focus:ring-primary/20 px-3 py-2 text-sm outline-none transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium">Confirm Password</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            required
            className="w-full rounded-md border bg-card/50 dark:bg-white/5 border-border/50 dark:border-white/[0.08] focus:border-primary/50 focus:ring-2 focus:ring-primary/20 px-3 py-2 text-sm outline-none transition-all"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

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
            "Reset Password"
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-500/10 via-background to-cyan-500/5 dark:from-violet-500/15 dark:via-background dark:to-cyan-500/8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-6 rounded-2xl border border-border/50 dark:border-white/[0.08] bg-card/80 dark:bg-card/60 backdrop-blur-xl p-8 shadow-xl"
      >
        <Link href="/" className="flex justify-center hover:opacity-80 transition-opacity">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-2xl font-bold shadow-lg shadow-violet-500/25">
              D
            </div>
            <span className="text-xl font-bold tracking-tight">
              DrawLint<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">.ai</span>
            </span>
          </div>
        </Link>

        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
