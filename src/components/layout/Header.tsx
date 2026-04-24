"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { SignInButton, UserMenu } from "@/components/auth";
import { SettingsModal } from "@/components/settings";
import { Moon, Sun } from "lucide-react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
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
            href="/library"
            className="relative inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-violet-500 after:to-cyan-500 after:transition-all after:duration-300"
          >
            Library
          </Link>
          <Link
            href="/guide"
            className="relative inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-violet-500 after:to-cyan-500 after:transition-all after:duration-300"
          >
            Drawing Guide
          </Link>
          <Link
            href="/guide/byo-keys"
            className="relative inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-violet-500 after:to-cyan-500 after:transition-all after:duration-300"
          >
            BYO Keys
          </Link>
          <Link
            href="/support"
            className="relative inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-gradient-to-r after:from-violet-500 after:to-cyan-500 after:transition-all after:duration-300"
          >
            Support
          </Link>
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
            session ? <UserMenu session={session} onOpenSettings={() => setSettingsOpen(true)} /> : <SignInButton />
          )}
        </div>
      </header>
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
