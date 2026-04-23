"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import type { Session } from "next-auth";

interface UserMenuProps {
  session: Session;
  onOpenSettings?: () => void;
}

export default function UserMenu({ session, onOpenSettings }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = session.user;

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
        className="flex h-8 items-center gap-2 rounded-full border bg-background/80 pl-1.5 pr-3 text-sm transition-colors hover:bg-muted"
      >
        {user?.image ? (
          <img
            src={user.image}
            alt=""
            className="h-5 w-5 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <span className="max-w-[100px] truncate text-xs font-medium">
          {user?.name ?? "User"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border bg-background p-1 shadow-lg z-50">
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
        </div>
      )}
    </div>
  );
}
