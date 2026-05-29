import type { ParsedDiagram } from "@/types/diagram";
import type { ReviewLevel } from "@/types/feedback";

const LEVEL_LABELS: Record<ReviewLevel, string> = {
  mid: "Mid-Level (L4-L5)",
  senior: "Senior (L5-L6)",
  staff: "Staff (L6+)",
  deep: "Deep Analysis (full production review)",
};

/* ── Per-section data formatters ──────────────────────────────── */

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
  hldExplanation?: string,
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

    // Include other sections as cross-reference context for the HLD reviewer.
    // This prevents false flags like "no capacity sizing" when the user
    // already addressed it in the Capacity Calculations section.
    const crossRefSections = [
      { key: "nonFunctionalRequirements" as const, label: "NON-FUNCTIONAL REQUIREMENTS" },
      { key: "coreEntities" as const, label: "CORE ENTITIES" },
      { key: "capacityCalculations" as const, label: "CAPACITY CALCULATIONS" },
      { key: "apiRoutes" as const, label: "API ROUTES" },
    ];

    const crossRefContent = crossRefSections
      .filter(s => sections[s.key]?.trim())
      .map(s => `${s.label}:\n${sections[s.key].trim()}`)
      .join("\n\n");

    if (crossRefContent) {
      lines.push("=== OTHER SECTIONS (cross-reference context — do NOT re-review these, but use them to understand the full design) ===");
      lines.push("");
      lines.push(crossRefContent);
      lines.push("");
    }

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

    // Compute annotation-only nodes (in flow via annotations, not drawn arrows)
    const edgeConnectedIds = new Set(hld.edges.flatMap((e) => [e.from, e.to]));
    const annotationOnlyNodes = hld.nodes.filter(
      (n) =>
        !edgeConnectedIds.has(n.id) &&
        hld.annotations.some((a) => a.nearestNodeId === n.id)
    );

    if (annotationOnlyNodes.length > 0) {
      lines.push(
        `ANNOTATION-CONNECTED NODES (${annotationOnlyNodes.length} total — in flow via annotations, not drawn arrows):`
      );
      for (const node of annotationOnlyNodes) {
        const relatedAnns = hld.annotations
          .filter((a) => a.nearestNodeId === node.id)
          .map((a) => `"${a.text}"`)
          .join(", ");
        lines.push(`  - [${node.type.toUpperCase()}] "${node.label}" (referenced in: ${relatedAnns})`);
      }
      lines.push(
        "  NOTE: These nodes ARE connected to the flow via the above flow-step annotations."
      );
      lines.push("");
    }

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
      lines.push(
        "  (Nodes with 'near:' references above are part of the design flow even without drawn arrows)"
      );
      lines.push("");
    }

    if (hldExplanation?.trim()) {
      const safeExplanation = hldExplanation.trim().slice(0, 5000);
      lines.push("=== CANDIDATE'S EXPLANATION ===");
      lines.push("");
      lines.push(safeExplanation);
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
