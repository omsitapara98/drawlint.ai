"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import type { Session } from "next-auth";

interface UserMenuProps {
  session: Session;
  onOpenSettings?: () => void;
}

export default function UserMenu({ session, onOpenSettings }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = session.user;

  // Fetch role
  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { role?: string } | null) => {
        if (data?.role === "premium" || data?.role === "admin") setIsPremium(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-2 rounded-full border border-border/50 dark:border-white/[0.08] bg-card/50 dark:bg-white/5 backdrop-blur-sm pl-1.5 pr-3 text-sm transition-all hover:border-primary/30 hover:shadow-[0_0_12px_oklch(0.72_0.25_285_/15%)]"
      >
        {user?.image ? (
          <img
            src={user.image}
            alt=""
            className="h-5 w-5 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white shadow-[0_0_8px_oklch(0.72_0.25_285_/30%)]">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <span className="max-w-[100px] truncate text-xs font-medium">
          {user?.name ?? "User"}
        </span>
        {isPremium && <span className="text-[10px]" title="Premium">👑</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border border-border/50 dark:border-white/[0.12] bg-card dark:bg-zinc-900 p-1 shadow-xl dark:shadow-[0_0_30px_oklch(0_0_0_/30%)] z-50"
          >
            <div className="px-3 py-2 border-b mb-1">
              <p className="text-xs font-medium truncate">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            {onOpenSettings && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => { onOpenSettings(); setOpen(false); }}
              >
                <Settings className="h-3.5 w-3.5" />
                API Settings
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-xs"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
