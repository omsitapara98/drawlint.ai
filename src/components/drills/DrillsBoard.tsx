"use client";

import { useState } from "react";
import { DrillStatsWidget } from "./DrillStatsWidget";
import { DrillRunner } from "./DrillRunner";
import { DrillLeaderboard } from "./DrillLeaderboard";

export function DrillsBoard() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <div className="mb-8">
        <DrillStatsWidget refreshKey={refreshKey} />
      </div>

      <div className="mb-12">
        <DrillRunner onComplete={() => setRefreshKey((k) => k + 1)} />
      </div>

      <DrillLeaderboard refreshKey={refreshKey} />
    </>
  );
}
