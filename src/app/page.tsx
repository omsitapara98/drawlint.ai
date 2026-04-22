"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

import { DiagramCanvas } from "@/components/canvas";
import { FeedbackPanel } from "@/components/feedback";
import { Header } from "@/components/layout";
import { SettingsModal } from "@/components/settings";
import { Button } from "@/components/ui/button";
import {
  QuestionTitle,
  SplitSection,
  WhiteboardSection,
} from "@/components/whiteboard";
import { useAutoSave, useAnalysis } from "@/hooks";
import { loadDiagram } from "@/lib/storage";
import { serializeDiagram } from "@/lib/diagram";
import { X, MessageSquareText } from "lucide-react";

function gatherSections() {
  return {
    questionTitle: localStorage.getItem("drawlint:question-title") || "",
    functionalRequirements:
      localStorage.getItem("drawlint:section:functional-requirements") || "",
    assumptions: localStorage.getItem("drawlint:section:assumptions") || "",
    nonFunctionalRequirements:
      localStorage.getItem("drawlint:section:non-functional-requirements") || "",
    coreEntities:
      localStorage.getItem("drawlint:section:core-entities") || "",
    capacityCalculations:
      localStorage.getItem("drawlint:section:capacity-calculations") || "",
    apiRoutes: localStorage.getItem("drawlint:section:api-routes") || "",
  };
}

export default function Home() {
  const [elements, setElements] = useState<ExcalidrawElement[]>([]);
  const [initialData, setInitialData] = useState<ExcalidrawElement[] | null>(
    null,
  );
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
    const sections = gatherSections();
    analyze(serialized, sections);
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

      {/* Question Title */}
      <QuestionTitle />

      {/* Two-column layout */}
      <div className="relative flex flex-1 min-h-0 flex-col md:flex-row">
        {/* Left Column — structured sections */}
        <div className="w-full shrink-0 overflow-y-auto border-r bg-muted/20 p-3 md:w-[35%]">
          <div className="flex flex-col gap-3">
            <SplitSection
              topId="functional-requirements"
              topTitle="Functional Requirements"
              topPlaceholder="• Users can create short URLs&#10;• Redirect to original URL&#10;• Custom aliases optional"
              bottomId="assumptions"
              bottomTitle="Assumptions"
              bottomPlaceholder="• 100M URLs created/month&#10;• 10:1 read/write ratio&#10;• URLs expire after 5 years"
              splitRatio="70/30"
            />

            <WhiteboardSection
              id="non-functional-requirements"
              title="Non-Functional Requirements"
              placeholder="• Low latency (<100ms redirect)&#10;• High availability (99.99%)&#10;• URL should not be guessable"
              minRows={3}
            />

            <SplitSection
              topId="core-entities"
              topTitle="Core Entities"
              topPlaceholder="• URL: { shortCode, originalUrl, userId, createdAt, expiresAt }&#10;• User: { id, email, apiKey }"
              bottomId="capacity-calculations"
              bottomTitle="Capacity Calculations"
              bottomPlaceholder="• 100M URLs/month ≈ ~40 URLs/sec write&#10;• 1B reads/month ≈ ~400 reads/sec&#10;• Storage: 100M × 1KB = 100GB/month"
              splitRatio="50/50"
            />

            <WhiteboardSection
              id="api-routes"
              title="API Routes"
              placeholder="POST /api/urls  → Create short URL&#10;GET  /:code      → Redirect to original&#10;GET  /api/urls/:code/stats → Analytics&#10;DELETE /api/urls/:code → Delete URL"
              minRows={6}
            />
          </div>
        </div>

        {/* Right Column — Excalidraw canvas */}
        <div className="relative flex-1 min-h-[400px]">
          {/* High-Level Design overlay label */}
          <div className="pointer-events-none absolute top-3 left-3 z-20">
            <span className="rounded-md bg-background/80 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
              High-Level Design
            </span>
          </div>

          <DiagramCanvas onChange={handleChange} initialData={initialData} />

          {/* Floating Analyze Button — top right */}
          {!panelOpen && (
            <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
              {hasDrawnShapes && (
                <div className="rounded-full bg-background/80 backdrop-blur-sm border px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
                  {visibleElements.length} element
                  {visibleElements.length === 1 ? "" : "s"}
                </div>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={status === "analyzing" || !hasDrawnShapes}
                className="h-9 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-4 text-sm text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
              >
                {status === "analyzing" ? (
                  <>
                    <span className="mr-1.5 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <MessageSquareText className="mr-1.5 h-3.5 w-3.5" />
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
                <FeedbackPanel
                  feedback={feedback}
                  status={status}
                  error={error}
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
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
