"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2, FileEdit, Eye, Pencil, Sparkles, Zap, Key } from "lucide-react";

interface UserDesign {
  _id: string;
  topicId: string;
  topicName: string;
  topicSlug: string;
  version: number;
  status: "draft" | "submitted" | "reviewing" | "reviewed";
  reviewLevel: string;
  hasReview: boolean;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  reviewing: {
    label: "Reviewing",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  reviewed: {
    label: "Reviewed",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function MyDesignsTab() {
  const { status: authStatus } = useSession();
  const [designs, setDesigns] = useState<UserDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setLoading(false);
      return;
    }

    async function fetchDesigns() {
      try {
        const res = await fetch("/api/user/designs");
        if (!res.ok) throw new Error("Failed to load designs");
        const data = (await res.json()) as { designs: UserDesign[] };
        setDesigns(data.designs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load designs");
      } finally {
        setLoading(false);
      }
    }

    fetchDesigns();
  }, [authStatus]);

  if (authStatus !== "authenticated") {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <FileEdit className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Sign in to view your designs</p>
        <Link
          href="/signin"
          className="text-sm font-medium text-violet-500 hover:underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <FileEdit className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No designs yet</p>
        <Link
          href="/canvas"
          className="text-sm font-medium text-violet-500 hover:underline"
        >
          Create your first design
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {designs.map((d) => {
        const badge = STATUS_BADGE[d.status] ?? STATUS_BADGE.submitted;
        const href =
          d.status === "draft"
            ? `/canvas?edit=${d._id}&topic=${d.topicSlug}`
            : `/library/${d.topicSlug}/${d._id}`;

        return (
          <Link
            key={d._id}
            href={href}
            className="group block rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md shadow-black/[0.04] dark:shadow-none p-5 text-card-foreground hover:border-primary/30 hover:shadow-lg hover:shadow-violet-500/[0.08] dark:hover:shadow-[0_0_20px_oklch(0.72_0.25_285_/_15%)] hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
                {d.topicName}
              </h3>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="capitalize">{d.reviewLevel}</span>
              <span>·</span>
              <span>{timeAgo(d.updatedAt)}</span>
              {d.reviewedBy === "drawlint" && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium">
                    <Sparkles className="h-2.5 w-2.5" />
                    DrawLint AI
                  </span>
                </>
              )}
              {d.reviewedBy === "gemini" && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <Zap className="h-2.5 w-2.5" />
                    Gemini
                  </span>
                </>
              )}
              {d.reviewedBy === "azure" && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                    <Key className="h-2.5 w-2.5" />
                    Azure
                  </span>
                </>
              )}
            </div>

            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 transition-all group-hover:gap-2">
              {d.status === "draft" ? (
                <>
                  <Pencil className="h-3 w-3" />
                  Continue editing
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  View design
                </>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
