"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { DiagramCanvas } from "@/components/canvas";
import { FeedbackPanel } from "@/components/feedback";
import { Header } from "@/components/layout";
import { AuthGate } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks";
import { loadDiagram } from "@/lib/storage";
import { parseDiagram, createWhiteboardTemplate } from "@/lib/diagram";
import type { ParsedDiagram } from "@/types/diagram";
import type { AIReviewResponse, AnalysisStatus, ReviewLevel, ReviewerProgress, ReviewerKey } from "@/types/feedback";
import { X, RotateCcw, Monitor, Send, ChevronDown, Plus, Loader2, ArrowRight, ExternalLink, EyeOff, Cpu, Key } from "lucide-react";
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

function CanvasPageInner() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ── Edit mode (from design detail page) ────────────────────── */
  const editDesignId = searchParams.get("edit");
  const editTopicSlug = searchParams.get("topic");
  const [editModeInitialized, setEditModeInitialized] = useState(false);

  /* ── View mode (from library) ──────────────────────────────── */
  const viewDesignId = searchParams.get("view");
  const [viewModeInitialized, setViewModeInitialized] = useState(false);
  const [viewIsAuthor, setViewIsAuthor] = useState(false);
  const [viewAuthorName, setViewAuthorName] = useState<string | null>(null);
  const [viewEditMode, setViewEditMode] = useState(false);

  /* ── Phase gate ──────────────────────────────────────────────── */
  const [phase, setPhase] = useState<"select" | "draw">(
    editDesignId || viewDesignId ? "draw" : "select",
  );

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
  const [panelOpen, setPanelOpen] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [parsedDiagram, setParsedDiagram] = useState<ParsedDiagram | null>(null);
  const [aiReview, setAiReview] = useState<AIReviewResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<AnalysisStatus>("idle");
  const [aiError, setAiError] = useState<string | undefined>();
  const [viewModePolling, setViewModePolling] = useState(false);
  const [reviewLevel, setReviewLevel] = useState<ReviewLevel>("senior");
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_W);
  const [selectedTopic, setSelectedTopic] = useState<TopicOption | null>(null);
  const [submittedDesignId, setSubmittedDesignId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [pseudonym, setPseudonym] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);
  const [hasByoKey, setHasByoKey] = useState(false);
  const [aiMode, setAiMode] = useState<"managed" | "byo" | null>(null);
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
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const activeStreamRef = useRef(false);

  useAutoSave(elements);

  /* ── Load anonymous mode preference from localStorage ──────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("drawlint:anonymous-mode");
      if (raw === "true") setAnonymousMode(true);
    } catch { /* noop */ }
  }, []);

  /* ── Read BYO key presence from localStorage ──────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("drawlint:byo-key");
      if (raw) {
        const creds = JSON.parse(raw) as { apiKey?: string };
        setHasByoKey(!!creds.apiKey);
      }
    } catch { /* noop */ }
  }, []);

  /* ── Fetch email verification status and AI mode when authenticated ── */
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetch("/api/user/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { emailVerified?: boolean; aiMode?: "managed" | "byo" } | null) => {
        if (data) {
          setIsEmailVerified(data.emailVerified ?? true);
          if (data.aiMode) setAiMode(data.aiMode);
        }
      })
      .catch(() => { /* leave null — don't block submit on fetch error */ });
  }, [authStatus]);

  /* ── Sync settings after SettingsModal saves ─────────────────── */
  useEffect(() => {
    const handler = () => {
      // Re-read BYO key presence from localStorage
      try {
        const raw = localStorage.getItem("drawlint:byo-key");
        if (raw) {
          const creds = JSON.parse(raw) as { apiKey?: string };
          setHasByoKey(!!creds.apiKey);
        } else {
          setHasByoKey(false);
        }
      } catch { setHasByoKey(false); }

      // Re-fetch aiMode from server
      fetch("/api/user/settings")
        .then((r) => r.ok ? r.json() : null)
        .then((data: { emailVerified?: boolean; aiMode?: "managed" | "byo" } | null) => {
          if (data?.aiMode) setAiMode(data.aiMode);
        })
        .catch(() => {});
    };

    window.addEventListener("drawlint:settings-changed", handler);
    return () => window.removeEventListener("drawlint:settings-changed", handler);
  }, []);

  /* ── Fetch pseudonym when anonymous mode is toggled on ──────── */
  useEffect(() => {
    if (!anonymousMode || pseudonym) return;
    if (authStatus !== "authenticated") return;
    async function fetchPseudonym() {
      try {
        const res = await fetch("/api/auth/pseudonym");
        if (res.ok) {
          const data = (await res.json()) as { pseudonym: string };
          setPseudonym(data.pseudonym);
        }
      } catch { /* noop */ }
    }
    fetchPseudonym();
  }, [anonymousMode, pseudonym, authStatus]);

  const handleToggleAnonymous = useCallback(() => {
    setAnonymousMode((prev) => {
      const next = !prev;
      try { localStorage.setItem("drawlint:anonymous-mode", String(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

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

  /* ── Edit mode: load design elements + skip topic gate ──────── */
  useEffect(() => {
    if (!editDesignId || editModeInitialized || topicsLoading) return;

    async function initEditMode() {
      try {
        // Ensure canvas is editable in edit mode
        setSubmitted(false);

        // Find the matching topic from fetched topics
        if (editTopicSlug) {
          const matchedTopic = topics.find((t) => t.slug === editTopicSlug);
          if (matchedTopic) setSelectedTopic(matchedTopic);
        }

        // Fetch design metadata to get reviewLevel
        const metaRes = await fetch(`/api/designs/${editDesignId}`);
        if (metaRes.ok) {
          const metaData = (await metaRes.json()) as {
            design: { reviewLevel?: string };
          };
          if (metaData.design.reviewLevel) {
            setReviewLevel(metaData.design.reviewLevel as ReviewLevel);
          }
        }

        // Fetch design elements
        const res = await fetch(`/api/designs/${editDesignId}/elements`);
        if (res.ok) {
          const data = (await res.json()) as { elements: ExcalidrawElement[] };
          setElements(data.elements);
          setInitialData(data.elements);
          setCanvasKey((k) => k + 1);
        }

        setPhase("draw");
      } catch {
        // Fall back to normal flow
      } finally {
        setEditModeInitialized(true);
      }
    }

    initEditMode();
  }, [editDesignId, editTopicSlug, editModeInitialized, topics, topicsLoading]);

  /* ── View mode: load design in read-only + show review ─────── */
  useEffect(() => {
    if (!viewDesignId || viewModeInitialized || topicsLoading) return;
    // Don't initialize view mode if we're in edit mode
    if (editDesignId) return;

    async function initViewMode() {
      try {
        // Fetch design metadata (includes review, author, topic)
        const metaRes = await fetch(`/api/designs/${viewDesignId}`);
        if (!metaRes.ok) return;
        const metaData = (await metaRes.json()) as {
          design: {
            _id: string;
            reviewLevel?: string;
            userId: string;
            topicId: string;
            anonymousName?: string;
            status: "submitted" | "reviewing" | "reviewed";
          };
          review: AIReviewResponse | null;
          author: { _id: string; name?: string } | null;
          topic: { _id: string; name: string; slug: string } | null;
        };

        // Set topic from design metadata
        if (metaData.topic) {
          const matchedTopic = topics.find((t) => t._id === metaData.topic!._id.toString());
          if (matchedTopic) {
            setSelectedTopic(matchedTopic);
          } else {
            // Topic not in our list yet, create a minimal TopicOption
            setSelectedTopic({
              _id: metaData.topic._id.toString(),
              name: metaData.topic.name,
              slug: metaData.topic.slug,
              submissionCount: 0,
            });
          }
        }

        if (metaData.design.reviewLevel) {
          setReviewLevel(metaData.design.reviewLevel as ReviewLevel);
        }

        // Check if current user is the author
        const isOwner = !!(session?.user?.id && session.user.id === metaData.design.userId.toString());
        if (isOwner) {
          setViewIsAuthor(true);
        }

        // Display name: anonymous designs show pseudonym, unless viewer is the owner
        if (metaData.design.anonymousName && !isOwner) {
          setViewAuthorName(metaData.design.anonymousName);
        } else if (metaData.design.anonymousName && isOwner) {
          setViewAuthorName(metaData.design.anonymousName);
        } else {
          setViewAuthorName(metaData.author?.name ? String(metaData.author.name) : "Anonymous");
        }

        // Load review into panel
        if (metaData.review) {
          setAiReview(metaData.review);
          setAiStatus("complete");
          const diagram = parseDiagram([] as ExcalidrawElement[]);
          setParsedDiagram(diagram);
        } else if (metaData.design.status === "reviewing") {
          // Review is in progress on the server — show spinning state and start polling
          setAiStatus("analyzing");
          setViewModePolling(true);
          setReviewerProgress({
            nfrReview: "analyzing",
            entitiesReview: "analyzing",
            capacityReview: "analyzing",
            apiReview: "analyzing",
            hldReview: "analyzing",
            leadReviewer: "analyzing",
          });
        }

        // Fetch elements
        const elRes = await fetch(`/api/designs/${viewDesignId}/elements`);
        if (elRes.ok) {
          const elData = (await elRes.json()) as { elements: ExcalidrawElement[] };
          setElements(elData.elements);
          setInitialData(elData.elements);
          setCanvasKey((k) => k + 1);
        }

        setSubmittedDesignId(viewDesignId!);
        setSubmitted(true);
        if (metaData.review || metaData.design.status === "reviewing") {
          setPanelOpen(true);
        }
        setPhase("draw");
      } catch {
        // Fall back to normal flow
      } finally {
        setViewModeInitialized(true);
      }
    }

    initViewMode();
  }, [viewDesignId, viewModeInitialized, topicsLoading, editDesignId, topics, session?.user?.id]);

  /* ── Poll for review completion when reloading mid-review ───── */
  useEffect(() => {
    if (!viewModePolling || !viewDesignId || activeStreamRef.current) return;

    const poll = setInterval(async () => {
      // Skip if a live stream took over
      if (activeStreamRef.current) return;
      try {
        const res = await fetch(`/api/designs/${viewDesignId}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          design: { status: "submitted" | "reviewing" | "reviewed" };
          review: AIReviewResponse | null;
        };
        if (data.review) {
          setAiReview(data.review);
          setAiStatus("complete");
          setViewModePolling(false);
          clearInterval(poll);
        } else if (data.design.status !== "reviewing") {
          // Server finished but no review saved — surface an error
          setAiStatus("error");
          setAiError("Review could not be completed. Please try re-submitting.");
          setViewModePolling(false);
          clearInterval(poll);
        }
        // else still reviewing — keep polling
      } catch {
        // Network error — keep polling, don't stop on transient failures
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [viewModePolling, viewDesignId]);

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
    // Always start with a fresh canvas
    const template = createWhiteboardTemplate() as ExcalidrawElement[];
    setElements(template);
    setInitialData(template);
    setCanvasKey((k) => k + 1);
    setSubmitted(false);
    setAiReview(null);
    setAiStatus("idle");
    setAiError(undefined);
    setSubmittedDesignId(null);
    setPhase("draw");
  }, [selectedTopic, reviewLevel]);

  const handleChangeTopicLevel = useCallback(() => {
    setPhase("select");
    setPanelOpen(false);
    setAiReview(null);
    setAiStatus("idle");
    setAiError(undefined);
    setSubmittedDesignId(null);
    setSubmitted(false);
  }, []);

  /* ── Canvas data loading ────────────────────────────────────── */
  useEffect(() => {
    // In view/edit mode, initialData is set by the view/edit useEffect — skip default loading
    if (viewDesignId || editDesignId) return;

    const saved = loadDiagram();
    if (saved && saved.length > 0) {
      setElements(saved);
      setInitialData(saved);
    } else {
      const template = createWhiteboardTemplate() as ExcalidrawElement[];
      setElements(template);
      setInitialData(template);
    }
  }, [viewDesignId, editDesignId]);

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

  // Cancel any in-progress stream on unmount
  useEffect(() => {
    return () => {
      streamReaderRef.current?.cancel();
    };
  }, []);

  /** Start per-reviewer progress at submission time.
   * All 5 sections go to "analyzing" immediately (they run in parallel on the server).
   * leadReviewer starts "pending" and transitions to "analyzing" via the "lead-started" stream event.
   * Sections flip to "done" individually as each stream "section" event arrives. */
  const startReviewerProgress = useCallback(() => {
    setReviewerProgress({
      nfrReview: "analyzing",
      entitiesReview: "analyzing",
      capacityReview: "analyzing",
      apiReview: "analyzing",
      hldReview: "analyzing",
      leadReviewer: "pending",
    });
  }, []);

  const stopReviewerProgress = useCallback((final: "done" | "error") => {
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

    // Validate design has enough substance before allowing submission
    const sectionValues = Object.values(diagram.sections);
    const filledSections = sectionValues.filter((s) => s.trim().length > 10).length;
    const hldNodeCount = diagram.hld.nodes.length;

    if (filledSections < 3 || hldNodeCount < 2) {
      const missing: string[] = [];
      if (filledSections < 3) missing.push(`at least 3 template sections filled (found ${filledSections})`);
      if (hldNodeCount < 2) missing.push(`at least 2 HLD components (found ${hldNodeCount})`);
      setAiError(`Design is too incomplete to submit. Please ensure: ${missing.join(", ")}.`);
      setAiStatus("error");
      setPanelOpen(true);
      return;
    }

    setParsedDiagram(diagram);
    setPanelOpen(true);
    setAiStatus("analyzing");
    setAiError(undefined);
    setAiReview(null);
    setViewModePolling(false);
    startReviewerProgress();
    activeStreamRef.current = true;

    try {
      const isUpdate = !!(editDesignId || submittedDesignId);
      const targetId = editDesignId || submittedDesignId;
      const url = isUpdate ? `/api/designs/${targetId}` : "/api/designs";
      const method = isUpdate ? "PUT" : "POST";

      // Read BYO credentials from localStorage — never stored server-side
      let byoCreds: { apiKey?: string; endpoint?: string; deployment?: string } = {};
      try {
        const raw = localStorage.getItem("drawlint:byo-key");
        if (raw) byoCreds = JSON.parse(raw) as typeof byoCreds;
      } catch { /* noop */ }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isUpdate ? {} : { topicId: selectedTopic._id }),
          elements: elements as unknown[],
          reviewLevel,
          anonymous: anonymousMode,
          // Include BYO credentials only if configured — server uses them if present
          ...(byoCreds.apiKey ? {
            apiKey: byoCreds.apiKey,
            endpoint: byoCreds.endpoint,
            deployment: byoCreds.deployment,
          } : {}),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; quotaExceeded?: boolean; emailNotVerified?: boolean };
        if (data.quotaExceeded) {
          setAiError(
            "You've used all 10 free AI reviews this month. Add your own Azure OpenAI key in Settings to continue.",
          );
          stopReviewerProgress("error");
          activeStreamRef.current = false;
          return;
        }
        if (data.emailNotVerified) {
          setAiError(
            "Please verify your email before using DrawLint AI. Check your inbox for a verification link.",
          );
          stopReviewerProgress("error");
          activeStreamRef.current = false;
          return;
        }
        throw new Error(data.error ?? `Submission failed (${res.status})`);
      }

      if (!res.body) throw new Error("No response body");

      // Consume the NDJSON stream — each line is a JSON event
      const reader = res.body.getReader();
      streamReaderRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: {
            type: string;
            designId?: string;
            version?: number;
            section?: ReviewerKey;
            data?: unknown;
            review?: AIReviewResponse | null;
            design?: { _id: string };
            message?: string;
          };
          try {
            event = JSON.parse(trimmed) as typeof event;
          } catch {
            console.warn("NDJSON parse error:", trimmed);
            continue;
          }

          switch (event.type) {
            case "design":
              if (event.designId) setSubmittedDesignId(event.designId);
              setSubmitted(true);
              break;
            case "section":
              if (event.section) {
                setReviewerProgress((prev) => ({ ...prev, [event.section!]: "done" }));
              }
              break;
            case "lead-started":
              setReviewerProgress((prev) => ({ ...prev, leadReviewer: "analyzing" }));
              break;
            case "complete":
              if (event.review) {
                setAiReview(event.review);
                setAiStatus("complete");
                stopReviewerProgress("done");
              } else {
                setAiStatus("complete");
                stopReviewerProgress("done");
                setAiError("Design saved! Configure your Azure OpenAI key in Settings to get AI review.");
              }
              activeStreamRef.current = false;
              setViewEditMode(false);
              break;
            case "error":
              throw new Error(event.message ?? "AI review failed");
          }
        }
      }
      streamReaderRef.current = null;
    } catch (err) {
      setAiStatus("error");
      setAiError(err instanceof Error ? err.message : "An unexpected error occurred.");
      stopReviewerProgress("error");
      activeStreamRef.current = false;
    }
  }, [selectedTopic, authStatus, router, elements, reviewLevel, anonymousMode, editDesignId, submittedDesignId, startReviewerProgress, stopReviewerProgress]);

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
        <Header />
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
            {/* Info bar: topic + level + actions (all controls here, nothing floating on canvas) */}
            <div className="flex h-10 items-center border-b bg-muted/50 px-4 gap-3 shrink-0 min-w-0">
              {/* Left: topic + level info */}
              <span className="text-xs shrink-0">📋</span>
              <span className="text-xs font-medium truncate min-w-0">{selectedTopic?.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">·</span>
              <span className="text-xs shrink-0">🎯</span>
              <span className="inline-flex h-5 items-center rounded-full bg-violet-100 px-2 text-[0.65rem] font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 shrink-0">
                {levelLabel(reviewLevel)}
              </span>
              {viewDesignId && viewAuthorName && (
                <>
                  <span className="text-xs text-muted-foreground shrink-0">·</span>
                  <span className="text-xs text-muted-foreground shrink-0">by {viewAuthorName}</span>
                </>
              )}
              {!viewDesignId && !submitted && !editDesignId && (
                <>
                  <span className="text-xs text-muted-foreground shrink-0">·</span>
                  <button
                    onClick={handleChangeTopicLevel}
                    className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors shrink-0"
                  >
                    Change
                  </button>
                </>
              )}

              {/* Posting as label — only in draw/edit modes, not view */}
              {!viewDesignId && authStatus === "authenticated" && (
                <>
                  <span className="text-xs text-muted-foreground shrink-0">·</span>
                  <span className="text-xs text-muted-foreground shrink-0">posting as:</span>
                  <button
                    onClick={handleToggleAnonymous}
                    className={`inline-flex h-5 items-center gap-1 rounded-full px-2 text-[0.65rem] font-semibold transition-colors shrink-0 border ${
                      anonymousMode
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                        : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800"
                    }`}
                    title={anonymousMode ? "Click to post as yourself" : "Click to post anonymously"}
                  >
                    {anonymousMode ? (
                      <>
                        <EyeOff className="h-2.5 w-2.5" />
                        {pseudonym ?? "…"}
                      </>
                    ) : (
                      <>
                        <span className="h-2.5 w-2.5 rounded-full bg-violet-500 inline-block" />
                        {session?.user?.name ?? "You"}
                      </>
                    )}
                  </button>
                </>
              )}

              {/* AI mode indicator — only in draw/edit modes, not view */}
              {!viewDesignId && authStatus === "authenticated" && aiMode && (
                <>
                  <span className="text-xs text-muted-foreground shrink-0">·</span>
                  <span className="text-xs text-muted-foreground shrink-0">ai mode:</span>
                  <span
                    className={`inline-flex h-5 items-center gap-1 rounded-full px-2 text-[0.65rem] font-semibold shrink-0 border ${
                      aiMode === "byo"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                    }`}
                  >
                    {aiMode === "byo" ? (
                      <>
                        <Key className="h-2.5 w-2.5" />
                        BYO Key
                      </>
                    ) : (
                      <>
                        <Cpu className="h-2.5 w-2.5" />
                        Managed AI
                      </>
                    )}
                  </span>
                </>
              )}

              {/* Right: action buttons */}
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {/* Drawing mode: Submit / Re-submit */}
                {((!submitted && !viewDesignId) || (!!viewDesignId && viewEditMode)) && (() => {
                  const emailBlocked = isEmailVerified === false;
                  const byoBlocked = aiMode === "byo" && !hasByoKey;
                  const isDisabled = aiStatus !== "analyzing" && (!hasDrawnShapes || emailBlocked || byoBlocked);
                  const tooltip = emailBlocked
                    ? "Email not verified — cannot submit"
                    : byoBlocked
                    ? "Add your Azure OpenAI credentials in Settings to submit"
                    : undefined;
                  return (
                    <button
                      onClick={aiStatus === "analyzing" ? () => setPanelOpen(p => !p) : handleSubmitDesign}
                      disabled={isDisabled}
                      title={tooltip}
                      className="inline-flex h-7 items-center gap-1 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiStatus === "analyzing" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      {aiStatus === "analyzing" ? "Analyzing…" : (editDesignId || submittedDesignId ? "Re-submit" : "Submit")}
                    </button>
                  );
                })()}

                {/* Post-submit mode: Edit unlocks canvas directly */}
                {submitted && !viewDesignId && (
                  <button
                    onClick={() => setSubmitted(false)}
                    className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Edit
                  </button>
                )}

                {/* View mode: Edit + Delete + AI Review (owner only, not in edit mode) */}
                {viewDesignId && viewIsAuthor && !viewEditMode && (
                  <>
                    <button
                      onClick={() => setViewEditMode(true)}
                      className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      className="inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 transition-colors"
                      onClick={async () => {
                        if (!confirm("Delete this design?")) return;
                        try {
                          await fetch(`/api/designs/${viewDesignId}`, { method: "DELETE" });
                          router.push(selectedTopic ? `/library/${selectedTopic.slug}` : "/library");
                        } catch { /* noop */ }
                      }}
                    >
                      <X className="h-3 w-3" />
                      Delete
                    </button>
                    {!panelOpen && (aiReview || aiStatus === "analyzing") && (
                      <button
                        onClick={() => setPanelOpen(true)}
                        className="inline-flex h-7 items-center gap-1 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-3 text-xs font-medium text-white transition-opacity hover:opacity-90"
                      >
                        AI Review
                      </button>
                    )}
                  </>
                )}

                {/* Show Review toggle (non-owner view, normal flow, or view edit mode) */}
                {!panelOpen && (aiReview || aiStatus === "analyzing") && !(viewDesignId && viewIsAuthor && !viewEditMode) && (
                  <button
                    onClick={() => setPanelOpen(true)}
                    className="inline-flex h-7 items-center gap-1 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-3 text-xs font-medium text-white transition-opacity hover:opacity-90"
                  >
                    {viewDesignId ? "AI Review" : "Show Review"}
                  </button>
                )}
              </div>
            </div>

            {/* Full-width Excalidraw canvas — NO floating controls */}
            <div className="relative flex-1 min-h-0">
              <DiagramCanvas key={canvasKey} onChange={handleChange} initialData={initialData} readOnly={!!viewDesignId ? !viewEditMode : submitted} />

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
                      aiReview={aiReview}
                      aiStatus={aiStatus}
                      aiError={aiError}
                      reviewerProgress={reviewerProgress}
                      onRetry={handleRetrySubmit}
                      onOpenSettings={() => {}}
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

      </div>
    </>
  );
}

export default function CanvasPage() {
  return (
    <Suspense fallback={null}>
      <CanvasPageInner />
    </Suspense>
  );
}
