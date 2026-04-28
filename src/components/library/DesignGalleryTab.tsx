"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { motion } from "framer-motion";

interface GalleryDesign {
  _id: string;
  topicName: string;
  topicSlug: string;
  displayName: string;
  avatarUrl: string | null;
  hireSignal: string | null;
  createdAt: string;
}

const SIGNAL_CONFIG: Record<string, { label: string; color: string }> = {
  "Strong Hire": {
    label: "Strong Hire",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
  },
  Hire: {
    label: "Hire",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300",
  },
  "Lean Hire": {
    label: "Lean Hire",
    color: "bg-lime-100 text-lime-700 dark:bg-lime-900/60 dark:text-lime-300",
  },
  "Lean No Hire": {
    label: "Lean No Hire",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
  },
  "No Hire": {
    label: "No Hire",
    color: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
  },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

export function DesignGalleryTab() {
  const [designs, setDesigns] = useState<GalleryDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/designs/gallery")
      .then((r) => r.json())
      .then((data: { designs: GalleryDesign[] }) => setDesigns(data.designs))
      .catch(() => setError("Failed to load designs"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Loading designs…</p>
      </div>
    );
  }

  if (error || designs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Search className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No designs yet</p>
        <p className="text-xs text-muted-foreground/60 max-w-xs">
          Be the first to submit a design review and appear in the gallery.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {designs.map((d) => (
        <motion.div key={d._id} variants={item}>
          <Link
            href={`/library/${d.topicSlug}/${d._id}`}
            className="group block rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md shadow-black/[0.04] dark:shadow-none p-5 text-card-foreground hover:border-primary/30 hover:shadow-lg hover:shadow-violet-500/[0.08] dark:hover:shadow-[0_0_20px_oklch(0.72_0.25_285_/_15%)] hover:-translate-y-0.5 transition-all duration-300"
          >
            {/* Topic name */}
            <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-2">
              {d.topicName}
            </p>

            {/* Author row */}
            <div className="flex items-center gap-2.5">
              {d.avatarUrl ? (
                <img
                  src={d.avatarUrl}
                  alt={d.displayName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {d.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.displayName}</p>
                <p className="text-[0.7rem] text-muted-foreground">
                  {timeAgo(d.createdAt)}
                </p>
              </div>
              {/* Hire signal badge */}
              {d.hireSignal && SIGNAL_CONFIG[d.hireSignal] && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${SIGNAL_CONFIG[d.hireSignal].color}`}
                >
                  {SIGNAL_CONFIG[d.hireSignal].label}
                </span>
              )}
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
