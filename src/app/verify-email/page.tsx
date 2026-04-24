"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token found in the link.");
      return;
    }

    // POST the token — using POST prevents link-scanner prefetch from auto-verifying
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
        } else {
          const data = (await res.json()) as { error?: string };
          setStatus("error");
          setErrorMessage(data.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] px-4">
      <div className="bg-[#16213e] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mx-auto mb-4" />
            <h1 className="text-white text-xl font-semibold">Verifying your email…</h1>
            <p className="text-white/50 text-sm mt-2">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-white text-xl font-semibold">Email verified!</h1>
            <p className="text-white/60 text-sm mt-2 mb-6">
              You can now use DrawLint AI for your design reviews.
            </p>
            <Link
              href="/canvas"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-2 rounded-lg transition"
            >
              Go to Canvas →
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-white text-xl font-semibold">Verification failed</h1>
            <p className="text-white/60 text-sm mt-2 mb-6">{errorMessage}</p>
            <Link
              href="/canvas"
              className="inline-block text-purple-400 hover:text-purple-300 text-sm underline underline-offset-2 transition"
            >
              Go to Canvas (you can resend from Settings)
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
