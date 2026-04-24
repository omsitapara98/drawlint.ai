"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailSentPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "your email";
  const initialEmailFailed = searchParams.get("emailFailed") === "1";

  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">(
    initialEmailFailed ? "error" : "idle",
  );
  const [errorMsg, setErrorMsg] = useState(
    initialEmailFailed ? "We couldn't send the verification email. Click below to try again." : "",
  );
  const [cooldown, setCooldown] = useState(0);

  async function handleResend() {
    setResendState("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = (await res.json()) as { error?: string };

      if (res.status === 429) {
        const match = data.error?.match(/\d+/);
        const secs = match ? parseInt(match[0]) : 60;
        setCooldown(secs);
        setResendState("error");
        setErrorMsg(data.error ?? "Please wait before resending.");
        // Count down
        const interval = setInterval(() => {
          setCooldown((s) => {
            if (s <= 1) { clearInterval(interval); return 0; }
            return s - 1;
          });
        }, 1000);
      } else if (!res.ok) {
        setResendState("error");
        setErrorMsg(data.error ?? "Failed to resend email.");
      } else {
        setResendState("sent");
      }
    } catch {
      setResendState("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] px-4">
      <div className="bg-[#16213e] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-white text-xl font-semibold">Check your inbox</h1>
        <p className="text-white/60 text-sm mt-3 mb-6">
          We sent a verification link to{" "}
          <span className="text-purple-300 font-medium">{email}</span>.
          Click the link in the email to activate DrawLint AI.
        </p>

        {resendState === "sent" && (
          <p className="text-green-400 text-sm mb-4">✓ Verification email resent!</p>
        )}

        {resendState === "error" && errorMsg && (
          <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
        )}

        <button
          onClick={handleResend}
          disabled={resendState === "sending" || cooldown > 0}
          className="text-purple-400 hover:text-purple-300 text-sm underline underline-offset-2 disabled:opacity-50 disabled:no-underline transition"
        >
          {resendState === "sending"
            ? "Sending…"
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Didn't receive it? Resend email"}
        </button>

        <p className="text-white/30 text-xs mt-6">
          Already verified?{" "}
          <a href="/canvas" className="text-purple-400 hover:text-purple-300 underline">
            Go to Canvas
          </a>
        </p>
      </div>
    </div>
  );
}
