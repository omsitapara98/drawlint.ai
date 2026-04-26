"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "drawlint:cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          We use essential cookies for authentication and session management. No tracking or advertising cookies.{" "}
          <Link href="/privacy" className="underline hover:text-foreground transition-colors">
            Learn more
          </Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
