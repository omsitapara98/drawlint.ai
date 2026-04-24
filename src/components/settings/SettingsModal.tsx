"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, ExternalLink, Loader2, CheckCircle2, MailWarning } from "lucide-react";

const BYO_STORAGE_KEY = "drawlint:byo-key";

interface AiSettings {
  aiMode: "managed" | "byo";
  emailVerified: boolean;
  managedUsage: { count: number; limit: number | null; month: number; year: number; resetsOn: string };
}

interface ByoCreds {
  apiKey: string;
  endpoint: string;
  deployment: string;
}

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const apiKeyRef = useRef<HTMLInputElement>(null);
  const endpointRef = useRef<HTMLInputElement>(null);
  const deploymentRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [selectedMode, setSelectedMode] = useState<"managed" | "byo">("managed");
  const [hasLocalKey, setHasLocalKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Load settings from server + read localStorage BYO creds when modal opens
  useEffect(() => {
    if (!open) return;
    setError(undefined);
    setLoading(true);

    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data: AiSettings) => {
        setSettings(data);
        setSelectedMode(data.aiMode);

        // Read BYO creds from localStorage (client-side only, never sent to server)
        try {
          const raw = localStorage.getItem(BYO_STORAGE_KEY);
          if (raw) {
            const creds = JSON.parse(raw) as Partial<ByoCreds>;
            setHasLocalKey(!!creds.apiKey);
            setTimeout(() => {
              if (apiKeyRef.current) apiKeyRef.current.value = creds.apiKey ? "••••••••" : "";
              if (endpointRef.current) endpointRef.current.value = creds.endpoint ?? "";
              if (deploymentRef.current) deploymentRef.current.value = creds.deployment ?? "";
            }, 0);
          } else {
            setHasLocalKey(false);
          }
        } catch { /* noop */ }
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, [open]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(undefined);

    try {
      // 1. Save BYO credentials to localStorage (if in BYO mode and a real key was entered)
      if (selectedMode === "byo") {
        const apiKey = apiKeyRef.current?.value.trim() ?? "";
        const endpoint = endpointRef.current?.value.trim() ?? "";
        const deployment = deploymentRef.current?.value.trim() ?? "";

        if (apiKey && apiKey !== "••••••••") {
          // New or updated key — save to localStorage
          const creds: ByoCreds = { apiKey, endpoint, deployment };
          localStorage.setItem(BYO_STORAGE_KEY, JSON.stringify(creds));
          setHasLocalKey(true);
        }
        // If placeholder "••••••••" — existing key unchanged, don't overwrite
      }

      // 2. Save mode preference to server (no credentials)
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiMode: selectedMode }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to save settings.");
      }
      const updated = (await res.json()) as AiSettings;
      setSettings(updated);
      onOpenChange(false);
      window.dispatchEvent(new CustomEvent("drawlint:settings-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }, [selectedMode, onOpenChange]);

  const handleClearByo = useCallback(() => {
    try { localStorage.removeItem(BYO_STORAGE_KEY); } catch { /* noop */ }
    setHasLocalKey(false);
    window.dispatchEvent(new CustomEvent("drawlint:settings-changed"));
    if (apiKeyRef.current) apiKeyRef.current.value = "";
    if (endpointRef.current) endpointRef.current.value = "";
    if (deploymentRef.current) deploymentRef.current.value = "";
  }, []);

  const inputClass =
    "w-full rounded-lg border border-border/50 dark:border-white/[0.08] bg-card/50 dark:bg-white/5 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all";

  const resetDate = settings?.managedUsage.resetsOn
    ? new Date(settings.managedUsage.resetsOn).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Review Settings</DialogTitle>
          <DialogDescription>
            Choose how DrawLint.ai runs AI reviews for your designs.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-md px-3 py-2">{error}</p>
            )}

            {/* Global email-not-verified banner (applies regardless of mode) */}
            {settings && !settings.emailVerified && (
              <div className="flex items-start gap-2.5 rounded-md border border-amber-400/30 bg-amber-50/60 dark:bg-amber-950/20 p-3">
                <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Email not verified</p>
                  <p className="text-xs text-muted-foreground">
                    Verify your email to submit designs.{" "}
                    <a href="/verify-email/sent" className="underline hover:text-foreground">Resend link →</a>
                  </p>
                </div>
              </div>
            )}

            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedMode("managed")}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  selectedMode === "managed"
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <p className="text-sm font-semibold">DrawLint AI</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                  {settings?.managedUsage.limit === null ? "Unlimited reviews/month" : "10 free reviews/month"}
                </p>
              </button>
              <button
                onClick={() => setSelectedMode("byo")}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  selectedMode === "byo"
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <p className="text-sm font-semibold">My Azure OpenAI</p>
                <p className="text-xs text-muted-foreground mt-0.5">Unlimited, your key</p>
              </button>
            </div>

            {selectedMode === "managed" && settings && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                {settings.managedUsage.limit === null ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Monthly usage</span>
                    <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">Unlimited ✦</span>
                  </div>
                ) : !settings.emailVerified ? (
                  <p className="text-xs text-muted-foreground">Quota available once your email is verified.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Monthly usage</span>
                      <span className="text-sm font-semibold">
                        {settings.managedUsage.count}
                        <span className="text-muted-foreground font-normal">/{settings.managedUsage.limit}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all"
                        style={{ width: `${Math.min(100, (settings.managedUsage.count / settings.managedUsage.limit) * 100)}%` }}
                      />
                    </div>
                    {resetDate && (
                      <p className="text-xs text-muted-foreground">
                        Resets on {resetDate}
                      </p>
                    )}
                    {settings.managedUsage.count >= settings.managedUsage.limit && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Monthly limit reached. Switch to My Azure OpenAI for unlimited reviews.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* BYO: credential form */}
            {selectedMode === "byo" && (
              <>
                <div className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-foreground/70">
                    Your key stays <strong>only in this browser</strong>. It&apos;s sent over HTTPS when you submit a review — we never log it, persist it, or store it.
                  </p>
                </div>

                {hasLocalKey && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Key configured in this browser
                  </div>
                )}

                {/* Setup guide link */}
                <a
                  href="/guide/byo-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  How to get an Azure OpenAI key →
                </a>

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">API Key</span>
                  <input ref={apiKeyRef} type="password" className={inputClass} placeholder="Enter new key to update…" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Endpoint URL</span>
                  <input ref={endpointRef} type="text" className={inputClass} placeholder="https://your-resource.openai.azure.com" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Deployment Name</span>
                  <input ref={deploymentRef} type="text" className={inputClass} placeholder="gpt-4o" />
                </label>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {selectedMode === "byo" && hasLocalKey && (
            <Button variant="outline" onClick={handleClearByo} disabled={saving}>
              Clear Key
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

