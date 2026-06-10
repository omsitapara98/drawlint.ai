"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { SignInButton, UserMenu } from "@/components/auth";
import { SettingsModal, AccountModal } from "@/components/settings";
import { Moon, Sun, Flame, Target } from "lucide-react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [drillStreak, setDrillStreak] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/challenge/streak")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { streak?: { currentStreak?: number } } | null) => {
        if (!cancelled && d?.streak?.currentStreak) setChallengeStreak(d.streak.currentStreak);
      })
      .catch(() => {});
    fetch("/api/drills/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { stats?: { currentStreak?: number } } | null) => {
        if (!cancelled && d?.stats?.currentStreak) setDrillStreak(d.stats.currentStreak);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  const challengeStreakDisplay = status === "authenticated" ? challengeStreak : 0;
  const drillStreakDisplay = status === "authenticated" ? drillStreak : 0;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener("drawlint:open-settings", handler);
    return () => window.removeEventListener("drawlint:open-settings", handler);
  }, []);

  return (
    <>
      <header
        className={`flex h-14 shrink-0 items-center justify-between px-4 sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/60 dark:bg-background/40 backdrop-blur-xl border-b border-violet-500/20 shadow-[0_1px_12px_oklch(0.72_0.25_285_/_10%)]"
            : "bg-background/80 backdrop-blur-sm border-b border-transparent"
        }`}
      >
        <Link data-tour="header-logo" href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/logo.svg" alt="DrawLint" width={32} height={32} className="rounded-lg shadow-sm transition-shadow hover:shadow-[0_0_15px_oklch(0.72_0.25_285_/_40%)]" />
          <span className="text-sm font-semibold tracking-tight">
            DrawLint
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              .ai
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            data-tour="header-challenge"
            href="/challenge"
            className="relative inline-flex items-center gap-1 rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-orange-500 after:to-red-500 after:transition-all after:duration-300"
          >
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Challenge
            {challengeStreakDisplay > 0 && (
              <span
                className="ml-0.5 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-orange-500"
                title={`${challengeStreakDisplay}-week Challenge streak`}
              >
                {challengeStreakDisplay}
              </span>
            )}
          </Link>
          <Link
            data-tour="header-drills"
            href="/drills"
            className="relative inline-flex items-center gap-1 rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-cyan-500 after:to-violet-500 after:transition-all after:duration-300"
          >
            <Target className="h-3.5 w-3.5 text-cyan-500" />
            Drills
            {drillStreakDisplay > 0 && (
              <span
                className="ml-0.5 rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-cyan-500"
                title={`${drillStreakDisplay}-day Drills streak`}
              >
                {drillStreakDisplay}
              </span>
            )}
          </Link>
          <Link
            data-tour="header-library"
            href="/library"
            className="relative inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-violet-500 after:to-cyan-500 after:transition-all after:duration-300"
          >
            Library
          </Link>
          <Link
            data-tour="header-guide"
            href="/guide"
            className="relative inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-violet-500 after:to-cyan-500 after:transition-all after:duration-300"
          >
            Drawing Guide
          </Link>
          <Link
            data-tour="header-learn"
            href="/learn"
            className="relative inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-violet-500 after:to-cyan-500 after:transition-all after:duration-300"
          >
            Learn
          </Link>
          <Link
            data-tour="header-ai-setup"
            href="/guide/byo-keys"
            className="relative inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-violet-500 after:to-cyan-500 after:transition-all after:duration-300"
          >
            AI Setup Guide
          </Link>
          <Link
            data-tour="header-support"
            href="/support"
            className="relative inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-violet-500 after:to-cyan-500 after:transition-all after:duration-300"
          >
            Support
          </Link>
          <Link
            data-tour="header-about"
            href="/about"
            className="relative inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-violet-500 after:to-cyan-500 after:transition-all after:duration-300"
          >
            About
          </Link>
          <div data-tour="header-account" className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9, rotate: 15 }}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
            </motion.button>
            {status !== "loading" && (
              session ? <UserMenu session={session} onOpenSettings={() => setSettingsOpen(true)} onOpenAccount={() => setAccountOpen(true)} /> : <SignInButton />
            )}
          </div>
        </div>
      </header>
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AccountModal open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  );
}
