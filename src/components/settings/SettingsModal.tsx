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
import { Shield, ChevronDown, Loader2, CheckCircle2 } from "lucide-react";

interface AiSettings {
  aiMode: "managed" | "byo";
  managedUsage: { count: number; limit: number; month: number; year: number; resetsOn: string };
  hasByoCredentials: boolean;
  maskedKeyLast4?: string;
  endpoint?: string;
  deployment?: string;
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [guideOpen, setGuideOpen] = useState(false);
  const [legacyKeyDetected, setLegacyKeyDetected] = useState(false);

  // Fetch settings when modal opens
  useEffect(() => {
    if (!open) return;
    setError(undefined);
    setLoading(true);

    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data: AiSettings) => {
        setSettings(data);
        setSelectedMode(data.aiMode);

        // Pre-populate BYO form with server-saved values
        setTimeout(() => {
          if (endpointRef.current) endpointRef.current.value = data.endpoint ?? "";
          if (deploymentRef.current) deploymentRef.current.value = data.deployment ?? "";
          if (apiKeyRef.current) apiKeyRef.current.value = data.hasByoCredentials ? "••••••••" : "";
        }, 0);

        // Detect legacy localStorage credentials and offer migration
        try {
          const raw = localStorage.getItem("drawlint:byo-key");
          if (raw && !data.hasByoCredentials) {
            const cfg = JSON.parse(raw) as { apiKey?: string; endpoint?: string; deployment?: string };
            if (cfg.apiKey) {
              setLegacyKeyDetected(true);
              setTimeout(() => {
                if (apiKeyRef.current) apiKeyRef.current.value = cfg.apiKey ?? "";
                if (endpointRef.current) endpointRef.current.value = cfg.endpoint ?? "";
                if (deploymentRef.current) deploymentRef.current.value = cfg.deployment ?? "";
              }, 0);
            }
          }
        } catch { /* noop */ }
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, [open]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(undefined);

    const patch: Record<string, unknown> = { aiMode: selectedMode };

    if (selectedMode === "byo") {
      const apiKey = apiKeyRef.current?.value.trim() ?? "";
      const endpoint = endpointRef.current?.value.trim() ?? "";
      const deployment = deploymentRef.current?.value.trim() ?? "";

      // Only send credentials if they're being changed (not the placeholder)
      if (apiKey && apiKey !== "••••••••") {
        patch.byoCredentials = { apiKey, endpoint, deployment };
        // Clear legacy localStorage key after saving to server
        try { localStorage.removeItem("drawlint:byo-key"); } catch { /* noop */ }
        setLegacyKeyDetected(false);
      }
    }

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to save settings.");
      }
      const updated = (await res.json()) as AiSettings;
      setSettings(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }, [selectedMode, onOpenChange]);

  const handleClearByo = useCallback(async () => {
    setSaving(true);
    setError(undefined);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearByo: true }),
      });
      if (!res.ok) throw new Error("Failed to clear credentials.");
      const updated = (await res.json()) as AiSettings;
      setSettings(updated);
      if (apiKeyRef.current) apiKeyRef.current.value = "";
      if (endpointRef.current) endpointRef.current.value = "";
      if (deploymentRef.current) deploymentRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear credentials.");
    } finally {
      setSaving(false);
    }
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
                <p className="text-xs text-muted-foreground mt-0.5">10 free reviews/month</p>
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

            {/* Managed: usage meter */}
            {selectedMode === "managed" && settings && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
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
              </div>
            )}

            {/* BYO: credential form */}
            {selectedMode === "byo" && (
              <>
                <div className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-foreground/70">
                    Your credentials are stored securely in your account and used server-side for AI reviews.
                  </p>
                </div>

                {legacyKeyDetected && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      We found a key saved in your browser. Save below to migrate it to your account.
                    </p>
                  </div>
                )}

                {settings?.hasByoCredentials && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Key configured (ends in {settings.maskedKeyLast4})
                    {settings.endpoint && <span className="text-muted-foreground truncate max-w-[180px]">· {settings.endpoint}</span>}
                  </div>
                )}

                {/* Setup guide */}
                <div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setGuideOpen((v) => !v)}
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${guideOpen ? "rotate-0" : "-rotate-90"}`} />
                    How to get an Azure OpenAI key
                  </button>
                  {guideOpen && (
                    <ol className="mt-2 ml-5 list-decimal space-y-1 text-xs text-muted-foreground">
                      <li>Go to <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">portal.azure.com</a> → Create an <strong>Azure OpenAI</strong> resource</li>
                      <li>Deploy a model (e.g. <code className="text-[11px] bg-muted px-1 rounded">gpt-4o</code>) in Azure AI Foundry</li>
                      <li>Copy the <strong>Endpoint URL</strong> and <strong>API Key</strong></li>
                      <li>Paste them below and save</li>
                    </ol>
                  )}
                </div>

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
          {selectedMode === "byo" && settings?.hasByoCredentials && (
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
