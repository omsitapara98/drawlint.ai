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
import {
  Shield,
  ExternalLink,
  Loader2,
  CheckCircle2,
  MailWarning,
  Sparkles,
  Zap,
  Key,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  getAIConfig,
  saveAIConfig,
  clearCredentials,
  type ClientAiProvider,
} from "@/lib/storage/ai-config";

type AiMode = "managed" | "gemini" | "azure";

interface AiSettings {
  aiMode: AiMode;
  emailVerified: boolean;
  role: string;
  managedUsage: { count: number; limit: number | null; month: number; year: number; resetsOn: string };
}

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TestStatus = "idle" | "testing" | "success" | "error";

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  // Gemini refs
  const geminiKeyRef = useRef<HTMLInputElement>(null);
  // Azure refs
  const azureKeyRef = useRef<HTMLInputElement>(null);
  const azureEndpointRef = useRef<HTMLInputElement>(null);
  const azureDeploymentRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [selectedMode, setSelectedMode] = useState<AiMode>("managed");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Credential state
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [hasAzureKey, setHasAzureKey] = useState(false);
  const [azureExpanded, setAzureExpanded] = useState(false);

  // Test connection state
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setError(undefined);
    setTestStatus("idle");
    setTestMessage("");
    setLoading(true);

    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((data: AiSettings) => {
        setSettings(data);
        // Normalize legacy "byo" → "azure"
        const mode = (data.aiMode === "byo" as string ? "azure" : data.aiMode) as AiMode;
        setSelectedMode(mode);
        setAzureExpanded(mode === "azure");

        // Load credentials from localStorage
        const config = getAIConfig();
        setHasGeminiKey(!!config.gemini?.apiKey);
        setHasAzureKey(!!config.azure?.apiKey);

        // Populate fields after render
        setTimeout(() => {
          if (geminiKeyRef.current && config.gemini?.apiKey) {
            geminiKeyRef.current.value = "••••••••";
          }
          if (azureKeyRef.current && config.azure?.apiKey) {
            azureKeyRef.current.value = "••••••••";
          }
          if (azureEndpointRef.current) {
            azureEndpointRef.current.value = config.azure?.endpoint ?? "";
          }
          if (azureDeploymentRef.current) {
            azureDeploymentRef.current.value = config.azure?.deployment ?? "";
          }
        }, 0);
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, [open]);

  const handleTestConnection = useCallback(async () => {
    setTestStatus("testing");
    setTestMessage("");

    const config = getAIConfig();
    let testBody: Record<string, string> = {};

    if (selectedMode === "gemini") {
      const key = geminiKeyRef.current?.value.trim() ?? "";
      const apiKey = key === "••••••••" ? (config.gemini?.apiKey ?? "") : key;
      if (!apiKey) {
        setTestStatus("error");
        setTestMessage("Please enter your API key first.");
        return;
      }
      testBody = { provider: "gemini", apiKey };
    } else if (selectedMode === "azure") {
      const key = azureKeyRef.current?.value.trim() ?? "";
      const apiKey = key === "••••••••" ? (config.azure?.apiKey ?? "") : key;
      const endpoint = azureEndpointRef.current?.value.trim() ?? "";
      const deployment = azureDeploymentRef.current?.value.trim() ?? "";
      if (!apiKey || !endpoint || !deployment) {
        setTestStatus("error");
        setTestMessage("Please fill in all fields first.");
        return;
      }
      testBody = { provider: "azure", apiKey, endpoint, deployment };
    } else {
      return;
    }

    try {
      const res = await fetch("/api/user/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testBody),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setTestStatus("success");
        setTestMessage("Connection successful ✅");
      } else {
        setTestStatus("error");
        setTestMessage(data.error ?? "Connection failed ❌");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Network error — check your connection.");
    }
  }, [selectedMode]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(undefined);

    try {
      const config = getAIConfig();

      // Save Gemini credentials
      if (selectedMode === "gemini") {
        const key = geminiKeyRef.current?.value.trim() ?? "";
        if (key && key !== "••••••••") {
          config.gemini = { apiKey: key };
          saveAIConfig(config);
          setHasGeminiKey(true);
        }
      }

      // Save Azure credentials
      if (selectedMode === "azure") {
        const key = azureKeyRef.current?.value.trim() ?? "";
        const endpoint = azureEndpointRef.current?.value.trim() ?? "";
        const deployment = azureDeploymentRef.current?.value.trim() ?? "";
        if (key && key !== "••••••••") {
          config.azure = { apiKey: key, endpoint, deployment };
          saveAIConfig(config);
          setHasAzureKey(true);
        } else if (config.azure) {
          // Update endpoint/deployment even if key unchanged
          config.azure.endpoint = endpoint || config.azure.endpoint;
          config.azure.deployment = deployment || config.azure.deployment;
          saveAIConfig(config);
        }
      }

      // Save mode preference to server
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

  const handleClearProvider = useCallback(
    (provider: ClientAiProvider) => {
      clearCredentials(provider);
      window.dispatchEvent(new CustomEvent("drawlint:settings-changed"));
      if (provider === "gemini") {
        setHasGeminiKey(false);
        if (geminiKeyRef.current) geminiKeyRef.current.value = "";
      } else if (provider === "azure") {
        setHasAzureKey(false);
        if (azureKeyRef.current) azureKeyRef.current.value = "";
        if (azureEndpointRef.current) azureEndpointRef.current.value = "";
        if (azureDeploymentRef.current) azureDeploymentRef.current.value = "";
      }
    },
    [],
  );

  const inputClass =
    "w-full rounded-lg border border-border/50 dark:border-white/[0.08] bg-card/50 dark:bg-white/5 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all";

  const resetDate = settings?.managedUsage.resetsOn
    ? new Date(settings.managedUsage.resetsOn).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Review Settings</DialogTitle>
          <DialogDescription>
            Choose how DrawLint runs AI reviews for your designs.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-md px-3 py-2">{error}</p>
            )}

            {/* Email-not-verified banner */}
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

            {/* ── Provider Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2">
              {/* DrawLint AI */}
              <button
                onClick={() => { setSelectedMode("managed"); setTestStatus("idle"); }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  selectedMode === "managed"
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">⭐ Recommended</span>
                </div>
                <p className="text-sm font-semibold">DrawLint AI</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Best quality • No setup</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">High quality</span>
                </div>
              </button>

              {/* Gemini (Free) */}
              <button
                onClick={() => { setSelectedMode("gemini"); setTestStatus("idle"); }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  selectedMode === "gemini"
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">💡 Free</span>
                </div>
                <p className="text-sm font-semibold">Free AI</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">No cost • Quick setup</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">Balanced</span>
                </div>
              </button>

              {/* Azure OpenAI (Advanced) */}
              <button
                onClick={() => { setSelectedMode("azure"); setAzureExpanded(true); setTestStatus("idle"); }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  selectedMode === "azure"
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Key className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">⚙️ Advanced</span>
                </div>
                <p className="text-sm font-semibold">Your AI</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Your key • Full control</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">User-controlled</span>
                </div>
              </button>
            </div>

            {/* ── DrawLint AI Details ──────────────────────────── */}
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
                      <p className="text-xs text-muted-foreground">Resets on {resetDate}</p>
                    )}
                    {settings.managedUsage.count >= settings.managedUsage.limit && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Monthly limit reached. Switch to Free AI or bring your own key.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Gemini Configuration ────────────────────────── */}
            {selectedMode === "gemini" && (
              <>
                <div className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-foreground/70">
                    Your key stays <strong>only in this browser</strong>. It&apos;s sent over HTTPS when you submit a review — we never store it.
                  </p>
                </div>

                {hasGeminiKey && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Gemini key configured
                  </div>
                )}

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Get a free Gemini API key →
                </a>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">API Key</span>
                  <input ref={geminiKeyRef} type="password" className={inputClass} placeholder="Enter your Gemini API key…" />
                </label>

                {/* Test Connection */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testStatus === "testing"}
                  >
                    {testStatus === "testing" && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Test Connection
                  </Button>
                  {testStatus === "success" && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {testMessage}
                    </span>
                  )}
                  {testStatus === "error" && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> {testMessage}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* ── Azure OpenAI Configuration ──────────────────── */}
            {selectedMode === "azure" && (
              <>
                <button
                  onClick={() => setAzureExpanded(!azureExpanded)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {azureExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Azure OpenAI Configuration
                  <span className="text-[10px] text-muted-foreground/60">(~10-15 min setup)</span>
                </button>

                {azureExpanded && (
                  <>
                    <div className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/5 p-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-xs leading-relaxed text-foreground/70">
                        Your key stays <strong>only in this browser</strong>. It&apos;s sent over HTTPS when you submit a review — we never store it.
                      </p>
                    </div>

                    {hasAzureKey && (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Azure key configured
                      </div>
                    )}

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
                      <input ref={azureKeyRef} type="password" className={inputClass} placeholder="Enter new key to update…" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium">Endpoint URL</span>
                      <input ref={azureEndpointRef} type="text" className={inputClass} placeholder="https://your-resource.openai.azure.com" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium">Deployment Name</span>
                      <input ref={azureDeploymentRef} type="text" className={inputClass} placeholder="gpt-4o" />
                    </label>

                    {/* Test Connection */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestConnection}
                        disabled={testStatus === "testing"}
                      >
                        {testStatus === "testing" && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                        Test Connection
                      </Button>
                      {testStatus === "success" && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {testMessage}
                        </span>
                      )}
                      {testStatus === "error" && (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> {testMessage}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {selectedMode === "gemini" && hasGeminiKey && (
            <Button variant="outline" onClick={() => handleClearProvider("gemini")} disabled={saving}>
              Clear Key
            </Button>
          )}
          {selectedMode === "azure" && hasAzureKey && (
            <Button variant="outline" onClick={() => handleClearProvider("azure")} disabled={saving}>
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

