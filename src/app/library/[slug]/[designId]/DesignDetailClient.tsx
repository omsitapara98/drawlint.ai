"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import ExcalidrawViewer from "@/components/library/ExcalidrawViewer";
import { FeedbackPanel } from "@/components/feedback/FeedbackPanel";
import { Button } from "@/components/ui/button";
import type { ReviewDimension, LeadReviewer, ReviewLevel, AIReviewResponse } from "@/types/feedback";

export interface SerializedReview {
  _id: string;
  designId: string;
  version: number;
  level: ReviewLevel;
  summary: string;
  nfrReview: ReviewDimension;
  entitiesReview: ReviewDimension;
  capacityReview: ReviewDimension;
  apiReview: ReviewDimension;
  hldReview: ReviewDimension;
  leadReviewer: LeadReviewer;
  followUpQuestions: string[];
  createdAt: string;
}

interface DesignDetailClientProps {
  designId: string;
  review: SerializedReview | null;
  isAuthor: boolean;
  topicSlug: string;
  hldExplanation: string | null;
}

export default function DesignDetailClient({
  designId,
  review,
  isAuthor,
  topicSlug,
  hldExplanation,
}: DesignDetailClientProps) {
  const router = useRouter();
  const [elements, setElements] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasExplanation = !!hldExplanation && hldExplanation.trim().length > 0;
  const [explanationOpen, setExplanationOpen] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(true);

  // Memoized so its identity is stable across renders — FeedbackPanel clears the
  // fetched re-eval whenever the review prop identity changes, which would wipe the
  // Hire->Strong-Hire transition on every render if rebuilt inline.
  const aiReview: AIReviewResponse | null = useMemo(
    () =>
      review
        ? {
            level: review.level,
            summary: review.summary,
            nfrReview: review.nfrReview,
            entitiesReview: review.entitiesReview,
            capacityReview: review.capacityReview,
            apiReview: review.apiReview,
            hldReview: review.hldReview,
            leadReviewer: review.leadReviewer,
            followUpQuestions: review.followUpQuestions,
          }
        : null,
    [review],
  );

  useEffect(() => {
    async function fetchElements() {
      try {
        const res = await fetch(`/api/designs/${designId}/elements`);
        if (!res.ok) throw new Error("Failed to load design elements");
        const data = (await res.json()) as { elements: Record<string, unknown>[] };
        setElements(data.elements);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    }
    fetchElements();
  }, [designId]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/designs/${designId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Delete failed");
      }
      router.push(`/library/${topicSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [designId, topicSlug, router]);

  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-8">
      {/* Author actions */}
      {isAuthor && (
        <div className="flex items-center justify-end gap-2 pb-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push(`/canvas?edit=${designId}&topic=${topicSlug}`)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold">Delete this design?</h3>
            <p className="text-xs text-muted-foreground">
              This will permanently remove the design, its review, and blob data. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Excalidraw Viewer — full width, large */}
        <div className="h-[72vh] min-h-[420px] overflow-hidden rounded-xl border bg-card">
          {error ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : !elements ? (
            <div className="flex h-full items-center justify-center">
              <LoadingSpinner message="Loading diagram…" />
            </div>
          ) : (
            <ExcalidrawViewer elements={elements} />
          )}
        </div>

        {/* Below the diagram: author explanation + review side by side */}
        <div className={hasExplanation ? "grid items-start gap-4 lg:grid-cols-2" : ""}>
          {/* Author's written explanation */}
          {hasExplanation && (
            <div
              className={`flex flex-col overflow-hidden rounded-xl border bg-card ${explanationOpen ? "lg:h-[78vh]" : ""}`}
            >
              <button
                type="button"
                onClick={() => setExplanationOpen((v) => !v)}
                className="flex w-full shrink-0 items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                aria-expanded={explanationOpen}
              >
                {explanationOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold">Author&apos;s explanation</span>
                <span className="ml-auto hidden text-[0.7rem] text-muted-foreground sm:inline">
                  How the author described their design
                </span>
              </button>
              {explanationOpen && (
                <div className="min-h-0 max-h-[70vh] flex-1 overflow-auto border-t px-4 py-4 lg:max-h-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {hldExplanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Design Review */}
          <div
            className={`flex flex-col overflow-hidden rounded-xl border bg-card ${reviewOpen ? "lg:h-[78vh]" : ""}`}
          >
            <button
              type="button"
              onClick={() => setReviewOpen((v) => !v)}
              className="flex w-full shrink-0 items-center gap-2 border-b px-4 py-3 text-left transition-colors hover:bg-muted/40"
              aria-expanded={reviewOpen}
            >
              {reviewOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold">
                AI
              </div>
              <span className="text-sm font-semibold">Design Review</span>
            </button>
            {reviewOpen && (
              <div className="min-h-0 flex-1 overflow-auto">
                {aiReview ? (
                  <FeedbackPanel
                    aiReview={aiReview}
                    aiStatus="complete"
                    designId={designId}
                    isAuthor={isAuthor}
                    layout="page"
                    defaultCollapsed
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 p-8">
                    <p className="text-sm text-muted-foreground text-center">
                      No review available yet.
                    </p>
                    {isAuthor && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => router.push(`/canvas?edit=${designId}&topic=${topicSlug}`)}
                      >
                        Run AI Review
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
