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
      lines.push(`  - [${node.type.toUpperCase()}] "${node.label}"`);
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
      lines.push(`  - "${cluster.label}" ×${cluster.count}`);
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

  return lines.join("\n");
}

/* ── Multi-call: per-section data formatters ──────────────────── */

export type SectionKey = "nfr" | "entities" | "capacity" | "api" | "hld";

const SECTION_TO_FIELD: Record<Exclude<SectionKey, "hld">, { key: keyof ParsedDiagram["sections"]; label: string }> = {
  nfr:      { key: "nonFunctionalRequirements", label: "NON-FUNCTIONAL REQUIREMENTS" },
  entities: { key: "coreEntities",              label: "CORE ENTITIES" },
  capacity: { key: "capacityCalculations",      label: "CAPACITY CALCULATIONS" },
  api:      { key: "apiRoutes",                 label: "API ROUTES" },
};

/**
 * Format only the relevant section data for a single reviewer call.
 * FR + Assumptions are always included as context.
 * For HLD: includes the full graph (nodes, edges, clusters, annotations).
 */
export function formatSectionForReview(
  diagram: ParsedDiagram,
  section: SectionKey,
  level: ReviewLevel = "senior",
): string {
  const lines: string[] = [];
  const { sections, hld } = diagram;

  lines.push(`=== REVIEW MODE: ${level.toUpperCase()} ===`);
  lines.push(`Evaluate this design for a ${LEVEL_LABELS[level]} interview.`);
  lines.push("");

  // Always include FR + Assumptions as context
  lines.push("=== CONTEXT (Functional Requirements & Assumptions) ===");
  lines.push("");
  if (sections.functionalRequirements?.trim()) {
    lines.push("FUNCTIONAL REQUIREMENTS:");
    lines.push(sections.functionalRequirements.trim());
    lines.push("");
  }
  if (sections.assumptions?.trim()) {
    lines.push("ASSUMPTIONS:");
    lines.push(sections.assumptions.trim());
    lines.push("");
  }

  // Section-specific content
  if (section === "hld") {
    // HLD gets the full graph
    lines.push("=== SECTION UNDER REVIEW: HIGH-LEVEL DESIGN ===");
    lines.push("");

    // Also include HLD text section if it exists
    // (ParsedDiagram.sections doesn't have an hld text field, so we skip)

    lines.push(`NODES (${hld.nodes.length} total):`);
    if (hld.nodes.length === 0) {
      lines.push("  (none)");
    } else {
      for (const node of hld.nodes) {
        lines.push(`  - [${node.type.toUpperCase()}] "${node.label}"`);
      }
    }
    lines.push("");

    const labelById = new Map(hld.nodes.map((n) => [n.id, n.label]));

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

    if (hld.clusters.length > 0) {
      lines.push(`CLUSTERS (${hld.clusters.length} total):`);
      for (const cluster of hld.clusters) {
        lines.push(`  - "${cluster.label}" ×${cluster.count}`);
      }
      lines.push("");
    }

    if (hld.annotations.length > 0) {
      lines.push(`ANNOTATIONS (${hld.annotations.length} total):`);
      for (const ann of hld.annotations) {
        const nearLabel = labelById.get(ann.nearestNodeId) ?? ann.nearestNodeId;
        lines.push(`  - "${ann.text}" (near: ${nearLabel})`);
      }
      lines.push("");
    }
  } else {
    // Text-based sections (nfr, entities, capacity, api)
    const mapping = SECTION_TO_FIELD[section];
    lines.push(`=== SECTION UNDER REVIEW: ${mapping.label} ===`);
    lines.push("");
    if (sections[mapping.key]?.trim()) {
      lines.push(`${mapping.label}:`);
      lines.push(sections[mapping.key].trim());
      lines.push("");
    } else {
      lines.push(`(No ${mapping.label.toLowerCase()} content provided by the candidate)`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
