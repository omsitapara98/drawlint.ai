"use client";

import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { SignInButton, UserMenu } from "@/components/auth";
import { SettingsModal } from "@/components/settings";
import { Moon, Sun } from "lucide-react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold shadow-sm">
            D
          </div>
          <span className="text-sm font-semibold tracking-tight">
            DrawLint<span className="text-violet-500">.ai</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/library"
            className="inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            Library
          </Link>
          <Link
            href="/guide"
            className="inline-flex items-center rounded-lg px-2.5 h-8 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            Guide
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 relative"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>
          {status !== "loading" && (
            session ? <UserMenu session={session} onOpenSettings={() => setSettingsOpen(true)} /> : <SignInButton />
          )}
        </div>
      </header>
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
