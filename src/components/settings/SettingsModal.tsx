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
  User,
  Trash2,
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

type SettingsTab = "ai" | "account";

interface AccountInfo {
  name: string;
  email: string;
  hasPassword: boolean;
  providers: string[];
  createdAt: string;
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  // Tab
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai");

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
  const [keyModified, setKeyModified] = useState(false);

  // Account state
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [changePwCurrent, setChangePwCurrent] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwStatus, setChangePwStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [changePwMessage, setChangePwMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Populate input refs when mode changes (refs only exist when section is rendered)
  useEffect(() => {
    const config = getAIConfig();
    if (selectedMode === "gemini" && geminiKeyRef.current && !geminiKeyRef.current.value && config.gemini?.apiKey) {
      geminiKeyRef.current.value = "••••••••";
    }
    if (selectedMode === "azure") {
      if (azureKeyRef.current && !azureKeyRef.current.value && config.azure?.apiKey) {
        azureKeyRef.current.value = "••••••••";
      }
      if (azureEndpointRef.current && !azureEndpointRef.current.value && config.azure?.endpoint) {
        azureEndpointRef.current.value = config.azure.endpoint;
      }
      if (azureDeploymentRef.current && !azureDeploymentRef.current.value && config.azure?.deployment) {
        azureDeploymentRef.current.value = config.azure.deployment;
      }
    }
  }, [selectedMode]);

  // Load account info when switching to account tab
  useEffect(() => {
    if (!open || activeTab !== "account" || accountInfo) return;
    setAccountLoading(true);
    fetch("/api/user/account")
      .then((r) => r.json())
      .then((data) => setAccountInfo(data))
      .catch(() => {})
      .finally(() => setAccountLoading(false));
  }, [open, activeTab, accountInfo]);

  // Reset account state on close
  useEffect(() => {
    if (!open) {
      setActiveTab("ai");
      setAccountInfo(null);
      setChangePwCurrent("");
      setChangePwNew("");
      setChangePwConfirm("");
      setChangePwStatus("idle");
      setChangePwMessage("");
      setDeleteConfirm(false);
    }
  }, [open]);

  async function handleChangePassword() {
    if (changePwNew.length < 8) {
      setChangePwStatus("error");
      setChangePwMessage("New password must be at least 8 characters");
      return;
    }
    if (changePwNew !== changePwConfirm) {
      setChangePwStatus("error");
      setChangePwMessage("Passwords do not match");
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
        setChangePwMessage("Password changed successfully!");
        setChangePwCurrent("");
        setChangePwNew("");
        setChangePwConfirm("");
      }
    } catch {
      setChangePwStatus("error");
      setChangePwMessage("Something went wrong");
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/account", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/";
      } else {
        setError("Failed to delete account");
        setDeleting(false);
      }
    } catch {
      setError("Something went wrong");
      setDeleting(false);
    }
  }

  const handleTestConnection= useCallback(async () => {
    setTestStatus("testing");
    setTestMessage("");

    const config = getAIConfig();
    let testBody: Record<string, string> = {};

    if (selectedMode === "gemini") {
      const key = geminiKeyRef.current?.value.trim() ?? "";
      // Fall back to stored key if input is empty/masked or ref not mounted
      const apiKey = (key && key !== "••••••••") ? key : (config.gemini?.apiKey ?? "");
      if (!apiKey) {
        setTestStatus("error");
        setTestMessage("Please enter your API key first.");
        return;
      }
      testBody = { provider: "gemini", apiKey };
    } else if (selectedMode === "azure") {
      const key = azureKeyRef.current?.value.trim() ?? "";
      const apiKey = (key && key !== "••••••••") ? key : (config.azure?.apiKey ?? "");
      const endpoint = azureEndpointRef.current?.value.trim() || config.azure?.endpoint || "";
      const deployment = azureDeploymentRef.current?.value.trim() || config.azure?.deployment || "";
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
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your AI review settings and account.
          </DialogDescription>
        </DialogHeader>

        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your AI review settings and account.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "ai" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
            AI Provider
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "account" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
            Account
          </button>
        </div>

        {activeTab === "account" && (
          /* ── Account Tab ─────────────────────────────────────── */
          <div className="flex flex-col gap-4">
            {accountLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : accountInfo ? (
              <>
                {/* Profile */}
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-violet-400" /> Profile
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Name</span>
                      <p className="font-medium">{accountInfo.name || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email</span>
                      <p className="font-medium">{accountInfo.email}</p>
                    </div>
                  </div>
                </div>

                {/* Connected Accounts */}
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-violet-400" /> Connected Accounts
                  </h3>
                  <div className="space-y-2">
                    {accountInfo.hasPassword && (
                      <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span>✉️</span>
                          <span className="font-medium">Email / Password</span>
                        </div>
                        <span className="text-[0.65rem] text-emerald-500 font-medium">Connected</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span className="font-medium">Google</span>
                      </div>
                      <span className={`text-[0.65rem] font-medium ${accountInfo.providers.includes("google") ? "text-emerald-500" : "text-muted-foreground/50"}`}>
                        {accountInfo.providers.includes("google") ? "Connected" : "Not connected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        <span className="font-medium">GitHub</span>
                      </div>
                      <span className={`text-[0.65rem] font-medium ${accountInfo.providers.includes("github") ? "text-emerald-500" : "text-muted-foreground/50"}`}>
                        {accountInfo.providers.includes("github") ? "Connected" : "Not connected"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Change Password (only for email/password users) */}
                {accountInfo.hasPassword && (
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Key className="h-4 w-4 text-violet-400" /> Change Password
                    </h3>
                    <div className="space-y-2">
                      <input
                        type="password"
                        placeholder="Current password"
                        value={changePwCurrent}
                        onChange={(e) => setChangePwCurrent(e.target.value)}
                        className={inputClass}
                      />
                      <input
                        type="password"
                        placeholder="New password (min 8 chars)"
                        value={changePwNew}
                        onChange={(e) => setChangePwNew(e.target.value)}
                        className={inputClass}
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={changePwConfirm}
                        onChange={(e) => setChangePwConfirm(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    {changePwStatus === "success" && (
                      <p className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {changePwMessage}</p>
                    )}
                    {changePwStatus === "error" && (
                      <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {changePwMessage}</p>
                    )}
                    <Button
                      size="sm"
                      onClick={handleChangePassword}
                      disabled={changePwStatus === "loading" || !changePwCurrent || !changePwNew}
                    >
                      {changePwStatus === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Update Password
                    </Button>
                  </div>
                )}

                {/* Delete Account */}
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-red-400">
                    <Trash2 className="h-4 w-4" /> Delete Account
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account, designs, reviews, and all associated data. This action cannot be undone.
                  </p>
                  {!deleteConfirm ? (
                    <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setDeleteConfirm(true)}>
                      Delete My Account
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleting}>
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                        Yes, Delete Everything
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Failed to load account info.</p>
            )}
          </div>
        )}

        {activeTab === "ai" && (
          loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <>
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
                onClick={() => { setSelectedMode("managed"); setTestStatus("idle"); setKeyModified(false); }}
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
                onClick={() => { setSelectedMode("gemini"); setTestStatus("idle"); setKeyModified(false); }}
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
                <p className="text-sm font-semibold">Gemini AI</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">No cost • Quick setup</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">Balanced</span>
                </div>
              </button>

              {/* Azure OpenAI (Advanced) */}
              <button
                onClick={() => { setSelectedMode("azure"); setAzureExpanded(true); setTestStatus("idle"); setKeyModified(false); }}
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
                <p className="text-sm font-semibold">Azure OpenAI</p>
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

                    {/* Pro teaser */}
                    <div className="rounded-lg border border-violet-200 dark:border-violet-800/50 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">✦</span>
                        <span className="text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                          Pro Plan — Coming Soon
                        </span>
                      </div>
                      <ul className="space-y-1 text-[0.7rem] text-muted-foreground">
                        <li className="flex items-center gap-1.5">
                          <span className="text-violet-500">→</span> More AI reviews per month
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="text-violet-500">→</span> Deeper evaluation depth
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="text-violet-500">→</span> Priority processing
                        </li>
                      </ul>
                      <p className="text-[0.65rem] text-violet-600/70 dark:text-violet-400/70 font-medium">
                        Starting at ₹99/month
                      </p>
                    </div>
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
                  <input ref={geminiKeyRef} type="password" className={inputClass} placeholder="Enter your Gemini API key…" onChange={() => { setKeyModified(true); setTestStatus("idle"); }} />
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
                      <input ref={azureKeyRef} type="password" className={inputClass} placeholder="Enter new key to update…" onChange={() => { setKeyModified(true); setTestStatus("idle"); }} />
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
            {(() => {
              const isByo = selectedMode !== "managed";
              const hasKey = selectedMode === "gemini" ? hasGeminiKey : selectedMode === "azure" ? hasAzureKey : true;
              const needsTest = isByo && (keyModified ? testStatus !== "success" : !hasKey);
              return (
                <Button onClick={handleSave} disabled={loading || saving || needsTest}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {needsTest ? (hasKey ? "Test Connection First" : "Add & Test Key First") : "Save"}
                </Button>
              );
            })()}
          </DialogFooter>
          </>
        ))}
      </DialogContent>
    </Dialog>
  );
}

