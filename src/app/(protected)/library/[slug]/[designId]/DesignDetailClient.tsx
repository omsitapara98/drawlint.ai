"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, RefreshCw } from "lucide-react";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import ExcalidrawViewer from "@/components/library/ExcalidrawViewer";
import ReviewPanel from "@/components/library/ReviewPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { ReviewDimension, LeadReviewer, ReviewLevel } from "@/types/feedback";

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
}

export default function DesignDetailClient({
  designId,
  review,
  isAuthor,
  topicSlug,
}: DesignDetailClientProps) {
  const router = useRouter();
  const [elements, setElements] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8">
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

      <div className="flex h-[calc(100vh-220px)] gap-4">
        {/* Excalidraw Viewer */}
        <div className="flex-1 overflow-hidden rounded-xl border bg-card">
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

        {/* Review Panel */}
        <div className="w-[420px] shrink-0 overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold">
              AI
            </div>
            <span className="text-sm font-semibold">Design Review</span>
          </div>
          <ScrollArea className="h-[calc(100%-52px)]">
            {review ? (
              <ReviewPanel review={review} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
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
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Run AI Review
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
