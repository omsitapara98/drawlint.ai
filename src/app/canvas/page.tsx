"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { DiagramCanvas } from "@/components/canvas";
import { FeedbackPanel } from "@/components/feedback";
import { Header } from "@/components/layout";
import { SettingsModal } from "@/components/settings";
import { AuthGate } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks";
import { loadDiagram, clearDiagram } from "@/lib/storage";
import { parseDiagram, createWhiteboardTemplate } from "@/lib/diagram";
import type { ParsedDiagram } from "@/types/diagram";
import type { AIReviewResponse, AnalysisStatus, ReviewLevel, ReviewerProgress, ReviewerKey } from "@/types/feedback";
import { X, RotateCcw, Monitor, Send, ChevronDown, Plus, Loader2, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

/* ── Topic gate types ─────────────────────────────────────────── */

interface TopicOption {
  _id: string;
  name: string;
  slug: string;
  submissionCount: number;
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

const LEVELS: ReviewLevel[] = ["mid", "senior", "staff", "deep"];

export default function CanvasPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  /* ── Phase gate ──────────────────────────────────────────────── */
  const [phase, setPhase] = useState<"select" | "draw">("select");

  /* ── Topic gate state ───────────────────────────────────────── */
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicSearch, setTopicSearch] = useState("");
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const topicContainerRef = useRef<HTMLDivElement>(null);
  const topicInputRef = useRef<HTMLInputElement>(null);

  /* ── Canvas state ───────────────────────────────────────────── */
  const [elements, setElements] = useState<ExcalidrawElement[]>([]);
  const [initialData, setInitialData] = useState<ExcalidrawElement[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [parsedDiagram, setParsedDiagram] = useState<ParsedDiagram | null>(null);
  const [aiReview, setAiReview] = useState<AIReviewResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<AnalysisStatus>("idle");
  const [aiError, setAiError] = useState<string | undefined>();
  const [reviewLevel, setReviewLevel] = useState<ReviewLevel>("senior");
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_W);
  const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null);
  const [submittedDesignId, setSubmittedDesignId] = useState<string | null>(null);
  const [reviewerProgress, setReviewerProgress] = useState<ReviewerProgress>({
    nfrReview: "pending",
    entitiesReview: "pending",
    capacityReview: "pending",
    apiReview: "pending",
    hldReview: "pending",
    leadReviewer: "pending",
  });
  const resizingRef = useRef(false);
  const prevFingerprintRef = useRef("");
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useAutoSave(elements);

  /* ── Fetch topics for the gate ──────────────────────────────── */
  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch("/api/topics?sort=popular");
        if (!res.ok) return;
        const data = (await res.json()) as { topics: TopicOption[] };
        setTopics(data.topics);
      } catch {
        // silent
      } finally {
        setTopicsLoading(false);
      }
    }
    fetchTopics();
  }, []);

  // Close topic dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (topicContainerRef.current && !topicContainerRef.current.contains(e.target as Node)) {
        setTopicDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredTopics = topics.filter((t) =>
    t.name.toLowerCase().includes(topicSearch.toLowerCase()),
  );

  const exactTopicMatch = topics.some(
    (t) => t.name.toLowerCase() === topicSearch.trim().toLowerCase(),
  );

  const handleTopicSelect = useCallback((topic: TopicOption) => {
    setSelectedTopic(topic);
    setTopicSearch("");
    setTopicDropdownOpen(false);
  }, []);

  const handleTopicCreate = useCallback(async () => {
    if (authStatus !== "authenticated") {
      router.push("/signin");
      return;
    }
    const name = topicSearch.trim();
    if (!name) return;
    setCreatingTopic(true);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        if (res.status === 409) {
          const existing = topics.find((t) => t.name.toLowerCase() === name.toLowerCase());
          if (existing) handleTopicSelect(existing);
        } else {
          console.error("Failed to create topic:", err.error);
        }
        return;
      }
      const data = (await res.json()) as { topic: TopicOption };
      setTopics((prev) => [data.topic, ...prev]);
      handleTopicSelect(data.topic);
    } catch {
      // silent
    } finally {
      setCreatingTopic(false);
    }
  }, [topicSearch, topics, handleTopicSelect]);

  const handleTopicClear = useCallback(() => {
    setSelectedTopic(null);
    setTopicSearch("");
  }, []);

  const handleStartDrawing = useCallback(() => {
    if (!selectedTopic || !reviewLevel) return;
    setPhase("draw");
  }, [selectedTopic, reviewLevel]);

  const handleChangeTopicLevel = useCallback(() => {
    setPhase("select");
    setPanelOpen(false);
    setAiReview(null);
    setAiStatus("idle");
    setAiError(undefined);
    setSubmittedDesignId(null);
  }, []);

  /* ── Canvas data loading ────────────────────────────────────── */
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

  useEffect(() => {
    setPanelWidth(loadPanelWidth());
  }, []);

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
      setSubmittedDesignId(null);
    }
  }, [elementFingerprint]);

  const handleChange = useCallback((els: readonly ExcalidrawElement[]) => {
    setElements(els as ExcalidrawElement[]);
  }, []);

  const visibleElements = elements.filter((el) => !el.isDeleted);
  const hasDrawnShapes = visibleElements.some((el) =>
    ["rectangle", "diamond", "ellipse", "arrow", "line"].includes(el.type),
  );

  // Clean up progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  /** Start simulated per-reviewer progress during submission. */
  const startReviewerProgress = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    const allPending: ReviewerProgress = {
      nfrReview: "pending", entitiesReview: "pending", capacityReview: "pending",
      apiReview: "pending", hldReview: "pending", leadReviewer: "pending",
    };
    setReviewerProgress(allPending);

    const sections: ReviewerKey[] = ["nfrReview", "entitiesReview", "capacityReview", "apiReview", "hldReview"];
    for (let i = sections.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sections[i], sections[j]] = [sections[j], sections[i]];
    }
    const order: ReviewerKey[] = [...sections, "leadReviewer"];
    let step = 0;

    progressIntervalRef.current = setInterval(() => {
      if (step < order.length) {
        const key = order[step];
        setReviewerProgress((prev) => ({ ...prev, [key]: "analyzing" }));
        if (step > 0) {
          const prevKey = order[step - 1];
          setReviewerProgress((prev) => ({ ...prev, [prevKey]: "done" }));
        }
        step++;
      } else {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, 2000);
  }, []);

  const stopReviewerProgress = useCallback((final: "done" | "error") => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setReviewerProgress({
      nfrReview: final, entitiesReview: final, capacityReview: final,
      apiReview: final, hldReview: final, leadReviewer: final,
    });
  }, []);

  /** Submit design — saves to library + triggers AI review + shows results in panel. */
  const handleSubmitDesign = useCallback(async () => {
    if (!selectedTopic) return;

    // Require auth
    if (authStatus !== "authenticated") {
      router.push("/signin");
      return;
    }

    const diagram = parseDiagram(elements);
    setParsedDiagram(diagram);
    setPanelOpen(true);
    setAiStatus("analyzing");
    setAiError(undefined);
    setAiReview(null);
    setSubmittedDesignId(null);
    startReviewerProgress();

    try {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedTopic._id,
          elements: elements as unknown[],
          parsedDiagram: diagram,
          reviewLevel,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Submission failed (${res.status})`);
      }

      const data = (await res.json()) as {
        design: { _id: string };
        review: AIReviewResponse;
      };

      setSubmittedDesignId(data.design._id);
      setAiReview(data.review);
      setAiStatus("complete");
      stopReviewerProgress("done");
    } catch (err) {
      setAiStatus("error");
      setAiError(err instanceof Error ? err.message : "An unexpected error occurred.");
      stopReviewerProgress("error");
    }
  }, [selectedTopic, authStatus, router, elements, reviewLevel, startReviewerProgress, stopReviewerProgress]);

  /** Retry a failed submission. */
  const handleRetrySubmit = useCallback(async () => {
    await handleSubmitDesign();
  }, [handleSubmitDesign]);

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
        const delta = startX - ev.clientX;
        const newW = Math.min(maxW, Math.max(PANEL_MIN_W, startW + delta));
        setPanelWidth(newW);
      };

      const onUp = () => {
        resizingRef.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
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
    setSubmittedDesignId(null);
  }, []);

  if (initialData === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const levelLabel = (lvl: ReviewLevel) =>
    lvl === "deep" ? "Deep" : lvl.charAt(0).toUpperCase() + lvl.slice(1);

  return (
    <>
      {/* Mobile guard — visible only on small screens */}
      <div className="flex md:hidden h-screen flex-col items-center justify-center gap-6 px-6 text-center bg-background">
        <span className="text-lg font-bold tracking-tight">
          Draw<span className="text-violet-500">Lint</span>.ai
        </span>
        <Monitor className="h-16 w-16 text-violet-500" strokeWidth={1.5} />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Desktop Experience Required</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            DrawLint.ai&apos;s whiteboard canvas requires a desktop browser for the
            best experience. Please visit us on a laptop or desktop computer.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5"
        >
          Back to Home
        </Link>
      </div>

      {/* Main layout — hidden on mobile */}
      <div className="hidden md:flex h-screen flex-col relative">
        <Header onOpenSettings={() => setSettingsOpen(true)} />
        <AuthGate />

        {/* ── Phase: Topic + Level Selection Gate ──────────────── */}
        {phase === "select" && (
          <div className="flex flex-1 items-center justify-center bg-background">
            <div className="w-full max-w-lg rounded-2xl border bg-background p-8 shadow-xl space-y-6">
              {/* Logo */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-lg font-bold shadow-lg">
                  D
                </div>
                <span className="text-lg font-bold tracking-tight">
                  Draw<span className="text-violet-500">Lint</span>.ai
                </span>
              </div>

              <div className="text-center space-y-1">
                <h1 className="text-xl font-semibold">Choose a System Design Topic</h1>
                <p className="text-sm text-muted-foreground">
                  Select a topic and review level before you start drawing.
                </p>
              </div>

              {/* Topic combobox */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Topic</label>
                <div ref={topicContainerRef} className="relative">
                  {selectedTopic ? (
                    <button
                      onClick={handleTopicClear}
                      className="flex h-10 w-full items-center justify-between rounded-lg border bg-violet-50 px-3 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-900/50 dark:text-violet-300 dark:hover:bg-violet-900"
                    >
                      {selectedTopic.name}
                      <span className="text-xs text-violet-500">✕</span>
                    </button>
                  ) : (
                    <>
                      <div
                        className="flex h-10 items-center rounded-lg border bg-background px-3 cursor-pointer"
                        onClick={() => {
                          setTopicDropdownOpen(true);
                          setTimeout(() => topicInputRef.current?.focus(), 0);
                        }}
                      >
                        {topicDropdownOpen ? (
                          <input
                            ref={topicInputRef}
                            value={topicSearch}
                            onChange={(e) => setTopicSearch(e.target.value)}
                            onFocus={() => setTopicDropdownOpen(true)}
                            placeholder="Search or create topic..."
                            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Select a system design topic...
                          </span>
                        )}
                        <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground shrink-0" />
                      </div>

                      {topicDropdownOpen && (
                        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
                          {topicsLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="max-h-48 overflow-y-auto py-1">
                              {filteredTopics.map((t) => (
                                <button
                                  key={t._id}
                                  onClick={() => handleTopicSelect(t)}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                >
                                  <span className="font-medium">{t.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {t.submissionCount}
                                  </span>
                                </button>
                              ))}
                              {filteredTopics.length === 0 && topicSearch.trim() && (
                                <p className="px-3 py-2 text-sm text-muted-foreground">
                                  No matching topics
                                </p>
                              )}
                              {topicSearch.trim() && !exactTopicMatch && (
                                authStatus === "authenticated" ? (
                                  <button
                                    onClick={handleTopicCreate}
                                    disabled={creatingTopic}
                                    className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-sm font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/30 transition-colors disabled:opacity-50"
                                  >
                                    {creatingTopic ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Plus className="h-3.5 w-3.5" />
                                    )}
                                    Create &quot;{topicSearch.trim()}&quot;
                                  </button>
                                ) : (
                                  <Link
                                    href="/signin"
                                    className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-sm font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/30 transition-colors"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Sign in to create topics
                                  </Link>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Level pills */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Review Level</label>
                <div className="flex h-10 items-center rounded-full border bg-background p-0.5">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setReviewLevel(lvl)}
                      className={`flex-1 h-9 rounded-full text-sm font-medium transition-all ${
                        reviewLevel === lvl
                          ? "bg-violet-500 text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {levelLabel(lvl)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Drawing button */}
              <Button
                onClick={handleStartDrawing}
                disabled={!selectedTopic}
                className="w-full h-11 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
              >
                Start Drawing
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>

              {authStatus !== "authenticated" && (
                <p className="text-center text-xs text-muted-foreground">
                  <Link href="/signin" className="text-violet-500 hover:underline">
                    Sign in
                  </Link>
                  {" "}to submit designs and create topics
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Phase: Drawing Canvas ───────────────────────────── */}
        {phase === "draw" && (
          <>
            {/* Info bar: topic + level + Change */}
            <div className="flex h-10 items-center border-b bg-muted/50 px-4 gap-3 shrink-0 min-w-0">
              <span className="text-xs shrink-0">📋</span>
              <span className="text-xs font-medium truncate min-w-0">{selectedTopic?.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">·</span>
              <span className="text-xs shrink-0">🎯</span>
              <span className="inline-flex h-5 items-center rounded-full bg-violet-100 px-2 text-[0.65rem] font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 shrink-0">
                {levelLabel(reviewLevel)}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">·</span>
              <button
                onClick={handleChangeTopicLevel}
                className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors shrink-0"
              >
                Change
              </button>
            </div>

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
                    onClick={handleSubmitDesign}
                    disabled={!hasDrawnShapes || aiStatus === "analyzing"}
                    className="h-9 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 px-4 text-sm text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Submit Design
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
                      {aiStatus === "complete" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRetrySubmit}
                          disabled={!hasDrawnShapes}
                          className="text-xs"
                        >
                          Re-submit
                        </Button>
                      )}
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

                  {/* "View in Library" link after successful submission */}
                  {submittedDesignId && selectedTopic && aiStatus === "complete" && (
                    <div className="shrink-0 border-b bg-emerald-50 px-4 py-2 dark:bg-emerald-950/30">
                      <Link
                        href={`/library/${selectedTopic.slug}/${submittedDesignId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View in Library →
                      </Link>
                    </div>
                  )}

                  {/* Panel content */}
                  <div className="flex-1 overflow-hidden">
                    <FeedbackPanel
                      diagram={parsedDiagram}
                      aiReview={aiReview}
                      aiStatus={aiStatus}
                      aiError={aiError}
                      reviewerProgress={reviewerProgress}
                      onRetry={handleRetrySubmit}
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
          </>
        )}

        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </>
  );
}
