"use client";

import { useState, useCallback } from "react";
import type { DiagramFeedback, AnalysisStatus } from "@/types/feedback";
import type { SerializedDiagram } from "@/types/diagram";
import {
  canAnalyze,
  recordAnalysis,
  getRemainingAnalyses,
  isUsingBYOKey,
} from "@/lib/storage/rate-limit";

interface BYOKeyConfig {
  apiKey?: string;
  endpoint?: string;
  deployment?: string;
}

interface UseAnalysisReturn {
  feedback: DiagramFeedback | null;
  status: AnalysisStatus;
  error: string | undefined;
  analyze: (diagram: SerializedDiagram) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [feedback, setFeedback] = useState<DiagramFeedback | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [error, setError] = useState<string | undefined>();

  const analyze = useCallback(async (diagram: SerializedDiagram) => {
    setError(undefined);
    setFeedback(null);

    // Check rate limit for free-tier users
    const byoKey = isUsingBYOKey();
    if (!byoKey && !canAnalyze()) {
      const remaining = getRemainingAnalyses();
      setStatus("error");
      setError(
        `Free trial limit reached (${remaining} analyses remaining this month). Add your own API key in Settings to continue.`,
      );
      return;
    }

    setStatus("analyzing");

    try {
      // Get BYO key config if available
      let byoConfig: BYOKeyConfig = {};
      try {
        const raw = localStorage.getItem("drawlint:byo-key");
        if (raw) {
          byoConfig = JSON.parse(raw) as BYOKeyConfig;
        }
      } catch {
        // Ignore parse errors
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagram,
          ...(byoConfig.apiKey && {
            apiKey: byoConfig.apiKey,
            endpoint: byoConfig.endpoint,
            deployment: byoConfig.deployment,
          }),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Analysis failed (${res.status})`);
      }

      const data = (await res.json()) as DiagramFeedback;
      setFeedback(data);
      setStatus("complete");

      // Record usage for free-tier users
      if (!byoKey) {
        recordAnalysis();
      }
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    }
  }, []);

  const reset = useCallback(() => {
    setFeedback(null);
    setStatus("idle");
    setError(undefined);
  }, []);

  return { feedback, status, error, analyze, reset };
}
