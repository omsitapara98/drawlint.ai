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
import { getCredentialsForRequest, getAIConfig } from "@/lib/storage/ai-config";

interface UseAnalysisReturn {
  feedback: DiagramFeedback | null;
  status: AnalysisStatus;
  error: string | undefined;
  analyze: (diagram: SerializedDiagram, sections?: WhiteboardSections) => Promise<void>;
  reset: () => void;
}

export interface WhiteboardSections {
  questionTitle: string;
  functionalRequirements: string;
  assumptions: string;
  nonFunctionalRequirements: string;
  coreEntities: string;
  capacityCalculations: string;
  apiRoutes: string;
}

export function useAnalysis(): UseAnalysisReturn {
  const [feedback, setFeedback] = useState<DiagramFeedback | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [error, setError] = useState<string | undefined>();

  const analyze = useCallback(async (diagram: SerializedDiagram, sections?: WhiteboardSections) => {
    setError(undefined);
    setFeedback(null);

    // Check rate limit for free-tier users
    const byoKey = isUsingBYOKey();
    if (!byoKey && !canAnalyze()) {
      const remaining = getRemainingAnalyses();
      setStatus("error");
      setError(
        `Free trial limit reached (${remaining} analyses remaining this month). Switch to Free AI (Gemini) or add your own key in Settings.`,
      );
      return;
    }

    setStatus("analyzing");

    try {
      // Get credentials from versioned AI config
      const config = getAIConfig();
      let provider: "managed" | "gemini" | "azure" = "managed";
      if (config.gemini?.apiKey) provider = "gemini";
      if (config.azure?.apiKey) provider = "azure";
      const creds = getCredentialsForRequest(provider);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagram,
          ...(sections && { sections }),
          ...(creds.apiKey && creds),
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
