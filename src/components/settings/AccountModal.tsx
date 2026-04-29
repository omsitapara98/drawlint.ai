"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  Trash2,
  Key,
  ExternalLink,
  EyeOff,
} from "lucide-react";

interface AccountInfo {
  name: string;
  email: string;
  hasPassword: boolean;
  emailVerified: boolean;
  role: string;
  providers: string[];
  createdAt: string;
}

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccountModal({ open, onOpenChange }: AccountModalProps) {
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [pseudonym, setPseudonym] = useState<string | null>(null);
  const [pseudonymLoading, setPseudonymLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Change password
  const [changePwCurrent, setChangePwCurrent] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwStatus, setChangePwStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [changePwMessage, setChangePwMessage] = useState("");
  const [showChangePw, setShowChangePw] = useState(false);

  useEffect(() => {
    if (!open) {
      setInfo(null);
      setPseudonym(null);
      setDeleteConfirm(false);
      setFetchError(null);
      setShowChangePw(false);
      setChangePwCurrent("");
      setChangePwNew("");
      setChangePwStatus("idle");
      setChangePwMessage("");
      return;
    }
    setLoading(true);
    setPseudonymLoading(true);
    Promise.all([
      fetch("/api/user/account")
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((data) => setInfo(data))
        .catch(() => setFetchError("Failed to load account details")),
      fetch("/api/auth/pseudonym")
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((data) => setPseudonym(data.pseudonym))
        .catch(() => setFetchError("Failed to load account details")),
    ]).finally(() => {
      setLoading(false);
      setPseudonymLoading(false);
    });
  }, [open]);

  async function handleChangePassword() {
    if (changePwNew.length < 8) {
      setChangePwStatus("error");
      setChangePwMessage("Min 8 characters");
      return;
    }
    setChangePwStatus("loading");
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: changePwCurrent, newPassword: changePwNew }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChangePwStatus("error");
        setChangePwMessage(data.error);
      } else {
        setChangePwStatus("success");
        setChangePwMessage("Updated!");
        setChangePwCurrent("");
        setChangePwNew("");
        setTimeout(() => setShowChangePw(false), 1500);
      }
    } catch {
      setChangePwStatus("error");
      setChangePwMessage("Something went wrong");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/account", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      } else {
        setDeleting(false);
      }
    } catch {
      setDeleting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border/50 dark:border-white/[0.08] bg-card/50 dark:bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>Manage your account and connected providers.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : fetchError && !info ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-muted-foreground">{fetchError}</p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-7 text-xs">
              Close
            </Button>
          </div>
        ) : info ? (
          <div className="flex flex-col gap-3">
            {/* Profile row */}
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{info.name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{info.email}</p>
              </div>
              {!info.emailVerified ? (
                <span className="shrink-0 rounded-full bg-amber-500/15 text-amber-400 px-2 py-0.5 text-[0.55rem] font-bold">
                  Pending Verification
                </span>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  {(info.role === "premium" || info.role === "admin") && (
                    <span className="text-base" title="Premium">👑</span>
                  )}
                  <span className="text-sky-500" title="Verified">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                    </svg>
                  </span>
                </div>
              )}
            </div>

            {/* Connected accounts */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-violet-400" /> Connected Accounts
              </p>
              <div className="space-y-1.5">
                {info.hasPassword && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">✉️ Email / Password</span>
                    <span className="text-emerald-500 text-[0.65rem] font-medium">Connected</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </span>
                  <span className={`text-[0.65rem] font-medium ${info.providers.includes("google") ? "text-emerald-500" : "text-muted-foreground/70"}`}>
                    {info.providers.includes("google") ? "Connected" : "Not connected"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    GitHub
                  </span>
                  <span className={`text-[0.65rem] font-medium ${info.providers.includes("github") ? "text-emerald-500" : "text-muted-foreground/70"}`}>
                    {info.providers.includes("github") ? "Connected" : "Not connected"}
                  </span>
                </div>
              </div>
            </div>

            {/* Anonymous handle */}
            {pseudonym && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  {pseudonymLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-violet-400" />
                  )}
                  Anonymous handle
                </p>
                <span className="font-mono text-sm block">{pseudonym}</span>
                <p className="text-xs text-muted-foreground">Used when you post designs anonymously.</p>
              </div>
            )}

            {/* Change password (collapsible) */}
            {info.hasPassword && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <button
                  onClick={() => setShowChangePw(!showChangePw)}
                  className="flex items-center gap-1.5 text-xs font-semibold hover:text-foreground transition-colors"
                >
                  <Key className="h-3.5 w-3.5 text-violet-400" />
                  Change Password
                  <span className="text-muted-foreground/50 ml-1">{showChangePw ? "▾" : "▸"}</span>
                </button>
                {showChangePw && (
                  <div className="space-y-2 pt-1">
                    <input type="password" placeholder="Current password" value={changePwCurrent} onChange={(e) => setChangePwCurrent(e.target.value)} className={inputClass} />
                    <input type="password" placeholder="New password (min 8)" value={changePwNew} onChange={(e) => setChangePwNew(e.target.value)} className={inputClass} />
                    {changePwStatus === "success" && <p className="text-[0.65rem] text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {changePwMessage}</p>}
                    {changePwStatus === "error" && <p className="text-[0.65rem] text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {changePwMessage}</p>}
                    <Button size="sm" variant="outline" onClick={handleChangePassword} disabled={changePwStatus === "loading" || !changePwCurrent || !changePwNew} className="h-7 text-xs">
                      {changePwStatus === "loading" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Update
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Danger zone */}
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Delete Account
              </p>
              {!deleteConfirm ? (
                <button onClick={() => setDeleteConfirm(true)} className="text-[0.65rem] text-red-400/70 hover:text-red-400 underline transition-colors">
                  Delete my account and all data
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="h-7 text-xs">
                    {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Yes, Delete Everything
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)} className="h-7 text-xs">
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Failed to load account info.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
