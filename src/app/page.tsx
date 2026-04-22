"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

import { DiagramCanvas } from "@/components/canvas";
import { FeedbackPanel } from "@/components/feedback";
import { Header } from "@/components/layout";
import { SettingsModal } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { useAutoSave, useAnalysis } from "@/hooks";
import { loadDiagram } from "@/lib/storage";
import { serializeDiagram } from "@/lib/diagram";
import { X, MessageSquareText } from "lucide-react";

export default function Home() {
  const [elements, setElements] = useState<ExcalidrawElement[]>([]);
  const [initialData, setInitialData] = useState<ExcalidrawElement[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const { feedback, status, error, analyze, reset } = useAnalysis();

  useAutoSave(elements);

  useEffect(() => {
    const saved = loadDiagram();
    if (saved) {
      setElements(saved);
      setInitialData(saved);
    } else {
      setInitialData([]);
    }
  }, []);

  const handleChange = useCallback((els: readonly ExcalidrawElement[]) => {
    setElements(els as ExcalidrawElement[]);
  }, []);

  const visibleElements = elements.filter((el) => !el.isDeleted);
  const hasDrawnShapes = visibleElements.some((el) =>
    ["rectangle", "diamond", "ellipse", "arrow", "line"].includes(el.type),
  );

  const handleAnalyze = useCallback(() => {
    const serialized = serializeDiagram(elements);
    analyze(serialized);
    setPanelOpen(true);
  }, [elements, analyze]);

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

      {/* Full-width canvas */}
      <div className="relative flex-1 min-h-0">
        <DiagramCanvas onChange={handleChange} initialData={initialData} />

        {/* Floating Analyze Button — bottom right */}
        {!panelOpen && (
          <div className="absolute bottom-6 right-6 z-30 flex flex-col items-end gap-2">
            {hasDrawnShapes && (
              <div className="rounded-full bg-background/80 backdrop-blur-sm border px-3 py-1 text-xs text-muted-foreground shadow-sm">
                {visibleElements.length} element{visibleElements.length === 1 ? "" : "s"}
              </div>
            )}
            <Button
              onClick={handleAnalyze}
              disabled={status === "analyzing" || !hasDrawnShapes}
              className="h-12 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-5 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
            >
              {status === "analyzing" ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analyzing…
                </>
              ) : (
                <>
                  <MessageSquareText className="mr-2 h-4 w-4" />
                  Analyze Design
                </>
              )}
            </Button>
          </div>
        )}

        {/* Floating Feedback Panel — slides in from right */}
        <div
          className={`absolute top-0 right-0 z-40 h-full w-full max-w-md transition-transform duration-300 ease-in-out ${
            panelOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
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
                  onClick={handleAnalyze}
                  disabled={status === "analyzing" || !hasDrawnShapes}
                  className="text-xs"
                >
                  {status === "analyzing" ? "Analyzing…" : "Re-analyze"}
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
              <FeedbackPanel feedback={feedback} status={status} error={error} />
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
