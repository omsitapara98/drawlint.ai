"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

import { DiagramCanvas } from "@/components/canvas";
import { FeedbackPanel } from "@/components/feedback";
import { Header } from "@/components/layout";
import { SettingsModal } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks";
import { loadDiagram, clearDiagram } from "@/lib/storage";
import { parseDiagram, createWhiteboardTemplate } from "@/lib/diagram";
import type { ParsedDiagram } from "@/types/diagram";
import type { AIReviewResponse, AnalysisStatus, ReviewLevel } from "@/types/feedback";
import { X, MessageSquareText, RotateCcw } from "lucide-react";

interface BYOConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
}

function loadBYOConfig(): BYOConfig | null {
  try {
    const raw = localStorage.getItem("drawlint:byo-key");
    if (!raw) return null;
    const config = JSON.parse(raw) as BYOConfig;
    if (config.apiKey && config.endpoint && config.deployment) return config;
    return null;
  } catch {
    return null;
  }
}

/* ── Panel resize constants ───────────────────────────────────── */

const PANEL_MIN_W = 320;
const PANEL_DEFAULT_W = 420;
const PANEL_STORAGE_KEY = "drawlint:panel-width";

function loadPanelWidth(): number {
  try {
    const raw = localStorage.getItem(PANEL_STORAGE_KEY);
    if (!raw) return PANEL_DEFAULT_W;
    const w = parseInt(raw, 10);
    if (Number.isNaN(w)) return PANEL_DEFAULT_W;
    return Math.max(PANEL_MIN_W, w);
  } catch {
    return PANEL_DEFAULT_W;
  }
}

export default function Home() {
  const [elements, setElements] = useState<ExcalidrawElement[]>([]);
  const [initialData, setInitialData] = useState<ExcalidrawElement[] | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [parsedDiagram, setParsedDiagram] = useState<ParsedDiagram | null>(null);
  const [aiReview, setAiReview] = useState<AIReviewResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<AnalysisStatus>("idle");
  const [aiError, setAiError] = useState<string | undefined>();
  const [reviewLevel, setReviewLevel] = useState<ReviewLevel>("senior");
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_W);
  const resizingRef = useRef(false);
  const prevFingerprintRef = useRef("");

  useAutoSave(elements);

  useEffect(() => {
    const saved = loadDiagram();
    if (saved && saved.length > 0) {
      setElements(saved);
      setInitialData(saved);
    } else {
      const template = createWhiteboardTemplate() as ExcalidrawElement[];
      setElements(template);
      setInitialData(template);
    }
  }, []);

  // Load panel width from localStorage
  useEffect(() => {
    setPanelWidth(loadPanelWidth());
  }, []);

  // Clear AI cache when review level changes
  useEffect(() => {
    setAiReview(null);
    setAiStatus("idle");
    setAiError(undefined);
  }, [reviewLevel]);

  // Track element changes — clear cache when diagram shapes are added/removed
  const elementFingerprint = useMemo(() => {
    return elements
      .filter(
        (el) =>
          !el.isDeleted &&
          ["rectangle", "diamond", "ellipse", "arrow", "line", "text"].includes(el.type),
      )
      .map((el) => el.id)
      .sort()
      .join(",");
  }, [elements]);

  useEffect(() => {
    const prev = prevFingerprintRef.current;
    prevFingerprintRef.current = elementFingerprint;
    if (prev !== "" && prev !== elementFingerprint) {
      setAiReview(null);
      setAiStatus("idle");
      setAiError(undefined);
    }
  }, [elementFingerprint]);

  const handleChange = useCallback((els: readonly ExcalidrawElement[]) => {
    setElements(els as ExcalidrawElement[]);
  }, []);

  const visibleElements = elements.filter((el) => !el.isDeleted);
  const hasDrawnShapes = visibleElements.some((el) =>
    ["rectangle", "diamond", "ellipse", "arrow", "line"].includes(el.type),
  );

  /** Shared helper — fires the actual AI API call. */
  const fireAiAnalysis = useCallback(
    async (diagram: ParsedDiagram) => {
      const config = loadBYOConfig();
      if (!config) {
        setAiStatus("idle");
        setAiReview(null);
        setAiError(undefined);
        return;
      }

      setAiStatus("analyzing");
      setAiError(undefined);
      setAiReview(null);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            diagram,
            apiKey: config.apiKey,
            endpoint: config.endpoint,
            deployment: config.deployment,
            level: reviewLevel,
          }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `Analysis failed (${res.status})`);
        }

        const data = (await res.json()) as AIReviewResponse;
        setAiReview(data);
        setAiStatus("complete");
      } catch (err) {
        setAiStatus("error");
        setAiError(
          err instanceof Error ? err.message : "An unexpected error occurred.",
        );
      }
    },
    [reviewLevel],
  );

  /** Opens panel — shows cached AI results when available, otherwise fires analysis. */
  const handleAnalyze = useCallback(async () => {
    const diagram = parseDiagram(elements);
    setParsedDiagram(diagram);
    setPanelOpen(true);

    // Show cached results if available — no new API call
    if (aiReview) return;

    await fireAiAnalysis(diagram);
  }, [elements, aiReview, fireAiAnalysis]);

  /** Always fires a fresh API call (Re-analyze / Retry). */
  const handleReAnalyze = useCallback(async () => {
    const diagram = parseDiagram(elements);
    setParsedDiagram(diagram);
    await fireAiAnalysis(diagram);
  }, [elements, fireAiAnalysis]);

  /** Drag-to-resize the side panel. */
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      const startX = e.clientX;
      const startW = panelWidth;

      const onMove = (ev: MouseEvent) => {
        if (!resizingRef.current) return;
        const maxW = Math.floor(window.innerWidth * 0.6);
        const delta = startX - ev.clientX; // dragging left = wider
        const newW = Math.min(maxW, Math.max(PANEL_MIN_W, startW + delta));
        setPanelWidth(newW);
      };

      const onUp = () => {
        resizingRef.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        // Persist final width
        setPanelWidth((w) => {
          try {
            localStorage.setItem(PANEL_STORAGE_KEY, String(w));
          } catch {
            /* noop */
          }
          return w;
        });
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [panelWidth],
  );

  const handleNewBoard = useCallback(() => {
    clearDiagram();
    const template = createWhiteboardTemplate() as ExcalidrawElement[];
    setElements(template);
    setInitialData(template);
    setCanvasKey((k) => k + 1);
    setPanelOpen(false);
    setParsedDiagram(null);
    setAiReview(null);
    setAiStatus("idle");
    setAiError(undefined);
  }, []);

  if (initialData === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      {/* Full-width Excalidraw canvas */}
      <div className="relative flex-1 min-h-0">
        <DiagramCanvas key={canvasKey} onChange={handleChange} initialData={initialData} />

        {/* Floating top-right controls */}
        {!panelOpen && (
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full text-xs"
              onClick={handleNewBoard}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              New Board
            </Button>

            {/* Level selector */}
            <div className="flex h-9 items-center rounded-full border bg-background/95 backdrop-blur-sm p-0.5">
              {(["mid", "senior", "staff", "deep"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setReviewLevel(lvl)}
                  className={`h-8 rounded-full px-3 text-xs font-medium transition-all ${
                    reviewLevel === lvl
                      ? "bg-violet-500 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lvl === "deep" ? "Deep" : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </button>
              ))}
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!hasDrawnShapes}
              className="h-9 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-4 text-sm text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
            >
              <MessageSquareText className="mr-1.5 h-3.5 w-3.5" />
              Analyze Design
            </Button>
          </div>
        )}

        {/* Floating Feedback Panel — slides in from right */}
        <div
          style={{ width: panelWidth }}
          className={`absolute top-0 right-0 z-40 h-full transition-transform duration-300 ease-in-out ${
            panelOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Resize drag handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 z-50 h-full w-1.5 cursor-col-resize hover:bg-violet-400/40 active:bg-violet-500/50 transition-colors"
          />
          <div className="flex h-full flex-col border-l bg-background/95 backdrop-blur-md shadow-2xl">
            {/* Panel header */}
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold">
                  AI
                </div>
                <span className="text-sm font-semibold">Design Review</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReAnalyze}
                  disabled={!hasDrawnShapes || aiStatus === "analyzing"}
                  className="text-xs"
                >
                  {aiStatus === "analyzing" ? "Analyzing…" : "Re-analyze"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPanelOpen(false)}
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-hidden">
              <FeedbackPanel
                diagram={parsedDiagram}
                aiReview={aiReview}
                aiStatus={aiStatus}
                aiError={aiError}
                onRetry={handleReAnalyze}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Backdrop when panel is open on mobile */}
        {panelOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/20 md:hidden"
            onClick={() => setPanelOpen(false)}
          />
        )}
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
