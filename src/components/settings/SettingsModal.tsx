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
import { Separator } from "@/components/ui/separator";

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
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

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
          {/* Appearance hint */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Appearance</h4>
            <p className="text-xs text-muted-foreground">Toggle dark mode from the header</p>
          </div>

          <Separator />

          <div className="text-xs">
            {configured ? (
              <span className="text-green-600 dark:text-green-400">
                ✓ BYO key configured
              </span>
            ) : (
              <span className="text-muted-foreground">
                Using free trial (limited analyses remaining)
              </span>
            )}
          </div>

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
