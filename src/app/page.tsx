"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

import { DiagramCanvas } from "@/components/canvas";
import { FeedbackPanel } from "@/components/feedback";
import { Header } from "@/components/layout";
import { SettingsModal } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks";
import { loadDiagram, clearDiagram } from "@/lib/storage";
import { extractSectionContents, createWhiteboardTemplate } from "@/lib/diagram";
import type { SectionContents } from "@/types/feedback";
import { X, MessageSquareText, RotateCcw } from "lucide-react";

export default function Home() {
  const [elements, setElements] = useState<ExcalidrawElement[]>([]);
  const [initialData, setInitialData] = useState<ExcalidrawElement[] | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [sectionContents, setSectionContents] = useState<SectionContents | null>(null);

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

  const handleChange = useCallback((els: readonly ExcalidrawElement[]) => {
    setElements(els as ExcalidrawElement[]);
  }, []);

  const visibleElements = elements.filter((el) => !el.isDeleted);
  const hasDrawnShapes = visibleElements.some((el) =>
    ["rectangle", "diamond", "ellipse", "arrow", "line"].includes(el.type),
  );

  const handleAnalyze = useCallback(() => {
    const sections = extractSectionContents(elements);
    setSectionContents(sections);
    setPanelOpen(true);
  }, [elements]);

  const handleNewBoard = useCallback(() => {
    clearDiagram();
    const template = createWhiteboardTemplate() as ExcalidrawElement[];
    setElements(template);
    setInitialData(template);
    setCanvasKey((k) => k + 1);
    setPanelOpen(false);
    setSectionContents(null);
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
                  disabled={!hasDrawnShapes}
                  className="text-xs"
                >
                  Re-analyze
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
              <FeedbackPanel sections={sectionContents} />
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
