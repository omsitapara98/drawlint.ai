"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Award, CheckCircle2, Star } from "lucide-react";

/* ── Types (mirror /api/drills/stats) ──────────────────────────── */

interface DrillStats {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalPoints: number;
  lastCompletedDay: string | null;
}

const cardCls =
  "rounded-xl border border-border dark:border-white/[0.08] bg-card dark:bg-card/60 shadow-md";

export function DrillStatsWidget() {
  const [stats, setStats] = useState<DrillStats | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/drills/stats");
        if (res.status === 401) return; // anonymous — render nothing
        if (!res.ok) return;
        const payload = await res.json();
        if (cancelled) return;
        setStats(payload.stats as DrillStats);
        setShow(true);
      } catch {
        /* silently skip the widget on error */
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show || !stats) return null;

  const items = [
    { icon: Flame, label: "Current streak", value: stats.currentStreak, accent: "text-orange-500" },
    { icon: Award, label: "Best streak", value: stats.longestStreak, accent: "text-violet-500" },
    { icon: CheckCircle2, label: "Drills done", value: stats.totalCompleted, accent: "text-emerald-500" },
    { icon: Star, label: "Total points", value: stats.totalPoints, accent: "text-cyan-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${cardCls} grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-4`}
    >
      {items.map(({ icon: Icon, label, value, accent }) => (
        <div key={label} className="flex flex-col items-center gap-1 px-4 py-5 text-center">
          <Icon className={`h-5 w-5 ${accent}`} />
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </motion.div>
  );
}
