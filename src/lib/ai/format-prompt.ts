import type { SerializedDiagram } from "@/types/diagram";

export function formatDiagramForAnalysis(diagram: SerializedDiagram): string {
  const lines: string[] = [];

  lines.push("=== ARCHITECTURE DIAGRAM ===");
  lines.push("");

  // Nodes section
  lines.push(`NODES (${diagram.nodes.length} total):`);
  if (diagram.nodes.length === 0) {
    lines.push("  (none)");
  } else {
    for (const node of diagram.nodes) {
      lines.push(`  - [${node.type.toUpperCase()}] "${node.label}" (id: ${node.id})`);
    }
  }
  lines.push("");

  // Build a lookup map for node labels by id
  const labelById = new Map(diagram.nodes.map((n) => [n.id, n.label]));

  // Connections section
  lines.push(`CONNECTIONS (${diagram.connections.length} total):`);
  if (diagram.connections.length === 0) {
    lines.push("  (none)");
  } else {
    for (const conn of diagram.connections) {
      const fromLabel = labelById.get(conn.from) ?? conn.from;
      const toLabel = labelById.get(conn.to) ?? conn.to;
      const edgeLabel = conn.label ? ` [${conn.label}]` : "";
      lines.push(`  - "${fromLabel}" -> "${toLabel}"${edgeLabel}`);
    }
  }
  lines.push("");

  // Stats
  lines.push("STATS:");
  lines.push(`  Total nodes: ${diagram.nodes.length}`);
  lines.push(`  Total connections: ${diagram.connections.length}`);
  lines.push(`  Raw element count: ${diagram.rawElementCount}`);

  return lines.join("\n");
}
