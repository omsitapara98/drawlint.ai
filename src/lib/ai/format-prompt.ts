import type { ParsedDiagram } from "@/types/diagram";
import type { ReviewLevel } from "@/types/feedback";

const LEVEL_LABELS: Record<ReviewLevel, string> = {
  mid: "Mid-Level (L4-L5)",
  senior: "Senior (L5-L6)",
  staff: "Staff (L6+)",
  deep: "Deep Analysis (full production review)",
};

export function formatDiagramForAnalysis(diagram: ParsedDiagram, level: ReviewLevel = "senior"): string {
  const lines: string[] = [];
  const { sections, hld } = diagram;

  // Review mode header
  lines.push(`=== REVIEW MODE: ${level.toUpperCase()} ===`);
  lines.push(`Evaluate this design for a ${LEVEL_LABELS[level]} interview.`);
  lines.push("");

  // Whiteboard context sections
  const sectionEntries: { key: keyof typeof sections; label: string }[] = [
    { key: "functionalRequirements", label: "FUNCTIONAL REQUIREMENTS" },
    { key: "assumptions", label: "ASSUMPTIONS" },
    { key: "nonFunctionalRequirements", label: "NON-FUNCTIONAL REQUIREMENTS" },
    { key: "coreEntities", label: "CORE ENTITIES" },
    { key: "capacityCalculations", label: "CAPACITY CALCULATIONS" },
    { key: "apiRoutes", label: "API ROUTES" },
  ];

  const hasContent = sectionEntries.some(({ key }) => sections[key]?.trim());
  if (hasContent) {
    lines.push("=== CANDIDATE'S WHITEBOARD NOTES ===");
    lines.push("");
    for (const { key, label } of sectionEntries) {
      if (sections[key]?.trim()) {
        lines.push(`${label}:`);
        lines.push(sections[key].trim());
        lines.push("");
      }
    }
  }

  // HLD Graph summary
  lines.push("=== ARCHITECTURE DIAGRAM ===");
  lines.push("");

  // Nodes
  lines.push(`NODES (${hld.nodes.length} total):`);
  if (hld.nodes.length === 0) {
    lines.push("  (none)");
  } else {
    for (const node of hld.nodes) {
      lines.push(`  - [${node.type.toUpperCase()}] "${node.label}" (id: ${node.id})`);
    }
  }
  lines.push("");

  // Build lookup map
  const labelById = new Map(hld.nodes.map((n) => [n.id, n.label]));

  // Edges
  lines.push(`CONNECTIONS (${hld.edges.length} total):`);
  if (hld.edges.length === 0) {
    lines.push("  (none)");
  } else {
    for (const edge of hld.edges) {
      const fromLabel = labelById.get(edge.from) ?? edge.from;
      const toLabel = labelById.get(edge.to) ?? edge.to;
      const edgeLabel = edge.label ? ` [${edge.label}]` : "";
      const seq = edge.sequence !== undefined ? ` (#${edge.sequence})` : "";
      lines.push(`  - "${fromLabel}" -> "${toLabel}"${edgeLabel}${seq}`);
    }
  }
  lines.push("");

  // Clusters
  if (hld.clusters.length > 0) {
    lines.push(`CLUSTERS (${hld.clusters.length} total):`);
    for (const cluster of hld.clusters) {
      const members = cluster.memberIds
        .map((id) => labelById.get(id) ?? id)
        .join(", ");
      lines.push(`  - "${cluster.label}" (${cluster.count} members: ${members})`);
    }
    lines.push("");
  }

  // Annotations
  if (hld.annotations.length > 0) {
    lines.push(`ANNOTATIONS (${hld.annotations.length} total):`);
    for (const ann of hld.annotations) {
      const nearLabel = labelById.get(ann.nearestNodeId) ?? ann.nearestNodeId;
      lines.push(`  - "${ann.text}" (near: ${nearLabel})`);
    }
    lines.push("");
  }

  // Stats
  lines.push("STATS:");
  lines.push(`  Total nodes: ${hld.nodes.length}`);
  lines.push(`  Total connections: ${hld.edges.length}`);
  lines.push(`  Total clusters: ${hld.clusters.length}`);
  lines.push(`  Total annotations: ${hld.annotations.length}`);
  lines.push("");

  // Full JSON for AI to parse
  lines.push("=== FULL PARSED DIAGRAM JSON ===");
  lines.push("```json");
  lines.push(JSON.stringify(diagram, null, 2));
  lines.push("```");

  return lines.join("\n");
}
