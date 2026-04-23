"use client";

import { useEffect, useState } from "react";
import ExcalidrawViewer from "@/components/library/ExcalidrawViewer";
import ReviewPanel from "@/components/library/ReviewPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

export default function DesignDetailClient({ designId, review }: DesignDetailClientProps) {
  const [elements, setElements] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8">
      <div className="flex h-[calc(100vh-220px)] gap-4">
        {/* Excalidraw Viewer */}
        <div className="flex-1 overflow-hidden rounded-xl border bg-card">
          {error ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : !elements ? (
            <div className="flex h-full items-center justify-center">
              <p className="animate-pulse text-sm text-muted-foreground">Loading diagram…</p>
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
              <div className="flex h-full items-center justify-center p-8">
                <p className="text-sm text-muted-foreground text-center">
                  No review available yet. This design is still being processed.
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
