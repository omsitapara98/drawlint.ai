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
import { Shield, ChevronDown } from "lucide-react";

const STORAGE_KEY = "drawlint:byo-key";

interface BYOConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
}

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function loadConfig(): BYOConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BYOConfig;
  } catch {
    return null;
  }
}

export default function SettingsModal({
  open,
  onOpenChange,
}: SettingsModalProps) {
  const apiKeyRef = useRef<HTMLInputElement>(null);
  const endpointRef = useRef<HTMLInputElement>(null);
  const deploymentRef = useRef<HTMLInputElement>(null);

  const [configured, setConfigured] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Populate form when dialog opens
  useEffect(() => {
    if (!open) return;
    const config = loadConfig();
    setConfigured(!!config);
    // Small delay so refs are mounted
    const id = setTimeout(() => {
      if (config) {
        if (apiKeyRef.current) apiKeyRef.current.value = config.apiKey;
        if (endpointRef.current) endpointRef.current.value = config.endpoint;
        if (deploymentRef.current)
          deploymentRef.current.value = config.deployment;
      }
    }, 0);
    return () => clearTimeout(id);
  }, [open]);

  const handleSave = useCallback(() => {
    const config: BYOConfig = {
      apiKey: apiKeyRef.current?.value.trim() ?? "",
      endpoint: endpointRef.current?.value.trim() ?? "",
      deployment: deploymentRef.current?.value.trim() ?? "",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    onOpenChange(false);
  }, [onOpenChange]);

  const handleClear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    if (apiKeyRef.current) apiKeyRef.current.value = "";
    if (endpointRef.current) endpointRef.current.value = "";
    if (deploymentRef.current) deploymentRef.current.value = "";
    setConfigured(false);
  }, []);

  const inputClass =
    "w-full rounded-lg border border-border/50 dark:border-white/[0.08] bg-card/50 dark:bg-white/5 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_12px_oklch(0.72_0.25_285_/_15%)] transition-all";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Azure OpenAI Settings</DialogTitle>
          <DialogDescription>
            Configure your own Azure OpenAI credentials for unlimited analyses.
            Your key is stored locally and never saved on our servers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Privacy notice */}
          <div className="flex items-start gap-2.5 rounded-md border border-primary/20 dark:border-primary/15 bg-primary/5 dark:bg-primary/10 backdrop-blur-sm p-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-foreground/70 dark:text-foreground/60">
              Your API key stays in your browser. It&apos;s sent directly to
              Azure OpenAI over HTTPS and is never stored on our servers.
            </p>
          </div>

          {/* Collapsible setup guide */}
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
                <li>
                  Go to{" "}
                  <a
                    href="https://portal.azure.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    portal.azure.com
                  </a>{" "}
                  → Create an <strong>Azure OpenAI</strong> resource
                </li>
                <li>
                  Deploy a model (e.g.&nbsp;<code className="text-[11px] bg-muted px-1 rounded">gpt-4o</code>) in Azure AI Foundry
                </li>
                <li>Copy the <strong>Endpoint URL</strong> and <strong>API Key</strong> from the resource</li>
                <li>Paste them below</li>
              </ol>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {configured && (
            <div className="text-xs animate-glow-pulse">
              <span className="text-emerald-500 dark:text-emerald-400">
                ✓ BYO key configured
              </span>
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium">API Key</span>
            <input
              ref={apiKeyRef}
              type="password"
              className={inputClass}
              placeholder="sk-…"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium">Endpoint URL</span>
            <input
              ref={endpointRef}
              type="text"
              className={inputClass}
              placeholder="https://your-resource.openai.azure.com"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium">Deployment Name</span>
            <input
              ref={deploymentRef}
              type="text"
              className={inputClass}
              placeholder="gpt-4o"
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
