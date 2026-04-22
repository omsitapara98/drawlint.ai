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

export default function Home() {
  const [elements, setElements] = useState<ExcalidrawElement[]>([]);
  const [initialData, setInitialData] = useState<ExcalidrawElement[] | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { feedback, status, error, analyze } = useAnalysis();

  useAutoSave(elements);

  // Load saved diagram on mount
  useEffect(() => {
    const saved = loadDiagram();
    if (saved) {
      setElements(saved);
      setInitialData(saved);
    } else {
      setInitialData([]);
    }
  }, []);

  const handleChange = useCallback(
    (els: readonly ExcalidrawElement[]) => {
      setElements(els as ExcalidrawElement[]);
    },
    [],
  );

  const handleAnalyze = useCallback(() => {
    const serialized = serializeDiagram(elements);
    analyze(serialized);
  }, [elements, analyze]);

  // Wait until initialData is resolved before rendering canvas
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

      {/* Analyze toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-xs text-muted-foreground">
            {elements.length > 0
              ? `${elements.length} element${elements.length === 1 ? "" : "s"} on canvas`
              : "Start drawing your system design"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={status === "analyzing" || elements.length === 0}
          className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:from-violet-600 hover:to-indigo-700 shadow-sm transition-all hover:shadow-md disabled:opacity-50"
        >
          {status === "analyzing" ? (
            <>
              <span className="mr-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Analyzing…
            </>
          ) : (
            "🤖 Analyze Design"
          )}
        </Button>
      </div>

      {/* Split pane */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_420px]">
        <div className="relative min-h-0 h-full border-r">
          <DiagramCanvas
            onChange={handleChange}
            initialData={initialData}
          />
        </div>
        <div className="h-full overflow-hidden bg-muted/10">
          <FeedbackPanel feedback={feedback} status={status} error={error} />
        </div>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
