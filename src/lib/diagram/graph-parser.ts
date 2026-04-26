import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  ParsedDiagram,
  GraphNode,
  GraphEdge,
  GraphAnnotation,
  GraphCluster,
} from "@/types/diagram";
import type { SectionContents } from "@/types/feedback";
import { getTextForElement, classifyNode, SECTION_DEFS } from "./serializer";

const SHAPE_TYPES = new Set(["rectangle", "diamond", "ellipse"]);

// HLD template rect bounds
const HLD_BOUNDS = { x: 1325, y: 38, w: 2990, h: 1805 };

function inHLD(ex: number, ey: number): boolean {
  return (
    ex >= HLD_BOUNDS.x &&
    ex <= HLD_BOUNDS.x + HLD_BOUNDS.w &&
    ey >= HLD_BOUNDS.y &&
    ey <= HLD_BOUNDS.y + HLD_BOUNDS.h
  );
}

function isTemplateElement(id: string): boolean {
  return id.startsWith("template-");
}

function euclideanDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/* ── Section text extraction (reuses SECTION_DEFS) ─────────── */

function extractSections(
  active: readonly ExcalidrawElement[],
): ParsedDiagram["sections"] {
  const templateIds = new Set(
    SECTION_DEFS.flatMap((s) => [s.rectId, s.textId]),
  );

  const boundTextIds = new Set<string>();
  for (const el of active) {
    const containerId = (el as Record<string, unknown>).containerId as
      | string
      | null
      | undefined;
    if (containerId && el.type === "text") {
      boundTextIds.add(el.id);
    }
  }

  const result: SectionContents = {
    functionalRequirements: "",
    assumptions: "",
    nonFunctionalRequirements: "",
    coreEntities: "",
    capacityCalculations: "",
    apiRoutes: "",
    hld: "",
  };

  for (const section of SECTION_DEFS) {
    // Skip HLD — we parse it structurally
    if (section.key === "hld") continue;

    const rectEl = active.find((e) => e.id === section.rectId);
    if (!rectEl) continue;

    const rx = rectEl.x;
    const ry = rectEl.y;
    const rw = (rectEl as Record<string, unknown>).width as number;
    const rh = (rectEl as Record<string, unknown>).height as number;

    const inBounds = (ex: number, ey: number) =>
      ex >= rx && ex <= rx + rw && ey >= ry && ey <= ry + rh;

    const collected: string[] = [];

    for (const el of active) {
      if (templateIds.has(el.id)) continue;
      if (!["rectangle", "ellipse", "diamond"].includes(el.type)) continue;
      if (!inBounds(el.x, el.y)) continue;

      const label = getTextForElement(el, active);
      if (label.trim()) collected.push(label.trim());
    }

    for (const el of active) {
      if (el.type !== "text") continue;
      if (templateIds.has(el.id)) continue;
      if (boundTextIds.has(el.id)) continue;
      if (!inBounds(el.x, el.y)) continue;

      const t = ((el as Record<string, unknown>).text as string) ?? "";
      if (t.trim()) collected.push(t.trim());
    }

    result[section.key] = collected.join("\n");
  }

  return {
    functionalRequirements: result.functionalRequirements,
    assumptions: result.assumptions,
    nonFunctionalRequirements: result.nonFunctionalRequirements,
    coreEntities: result.coreEntities,
    capacityCalculations: result.capacityCalculations,
    apiRoutes: result.apiRoutes,
  };
}

/* ── Logic description detection ────────────────────────────── */

// Shapes with long multi-line text are logic descriptions, not components.
// Real components have short labels like "Redis Cache" or "Api Gateway".
function isLogicDescription(label: string): boolean {
  if (!label) return false;
  const lineCount = label.split("\n").length;
  return lineCount > 3 || label.length > 120;
}

/* ── Pass 1: Node extraction ────────────────────────────────── */

interface ExtractedShapes {
  nodes: GraphNode[];
  logicBoxes: { id: string; label: string; x: number; y: number; w: number; h: number }[];
}

function extractNodes(
  active: readonly ExcalidrawElement[],
): ExtractedShapes {
  const nodes: GraphNode[] = [];
  const logicBoxes: ExtractedShapes["logicBoxes"] = [];

  for (const el of active) {
    if (isTemplateElement(el.id)) continue;
    if (!SHAPE_TYPES.has(el.type)) continue;
    if (!inHLD(el.x, el.y)) continue;

    const label = getTextForElement(el, active);
    const raw = el as Record<string, unknown>;
    const w = (raw.width as number) ?? 0;
    const h = (raw.height as number) ?? 0;

    // Long text in a box → logic description, not a component
    if (isLogicDescription(label)) {
      logicBoxes.push({ id: el.id, label, x: el.x, y: el.y, w, h });
      continue;
    }

    const nodeType = classifyNode(el.type, label);

    nodes.push({
      id: el.id,
      label: label || "",
      type: nodeType,
      position: { x: el.x, y: el.y },
      dimensions: { width: w, height: h },
      style: {
        strokeColor: (raw.strokeColor as string) ?? "#000000",
        backgroundColor: (raw.backgroundColor as string) ?? "transparent",
      },
    });
  }

  return { nodes, logicBoxes };
}

/* ── Pass 2: Edge extraction ────────────────────────────────── */

function findNearestNode(
  px: number,
  py: number,
  nodes: GraphNode[],
  maxDistance: number,
): string | null {
  let bestId: string | null = null;
  let bestDist = Infinity;

  for (const node of nodes) {
    const cx = node.position.x + node.dimensions.width / 2;
    const cy = node.position.y + node.dimensions.height / 2;
    const dist = euclideanDistance(px, py, cx, cy);
    if (dist < bestDist && dist <= maxDistance) {
      bestDist = dist;
      bestId = node.id;
    }
  }

  return bestId;
}

function extractEdges(
  active: readonly ExcalidrawElement[],
  nodes: GraphNode[],
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const nodeIdSet = new Set(nodes.map((n) => n.id));

  for (const el of active) {
    if (isTemplateElement(el.id)) continue;
    if (el.type !== "arrow" && el.type !== "line") continue;
    if (!inHLD(el.x, el.y)) continue;

    const raw = el as Record<string, unknown>;
    const startBinding = raw.startBinding as
      | { elementId: string }
      | null
      | undefined;
    const endBinding = raw.endBinding as
      | { elementId: string }
      | null
      | undefined;

    let fromId = startBinding?.elementId ?? "";
    let toId = endBinding?.elementId ?? "";

    // Only keep bindings that reference known HLD nodes
    if (fromId && !nodeIdSet.has(fromId)) fromId = "";
    if (toId && !nodeIdSet.has(toId)) toId = "";

    // For unbound endpoints, use proximity matching
    const points = raw.points as number[][] | undefined;
    if (!fromId && points && points.length > 0) {
      const startX = el.x + points[0][0];
      const startY = el.y + points[0][1];
      fromId = findNearestNode(startX, startY, nodes, 150) ?? "";
    }
    if (!toId && points && points.length > 1) {
      const lastPt = points[points.length - 1];
      const endX = el.x + lastPt[0];
      const endY = el.y + lastPt[1];
      toId = findNearestNode(endX, endY, nodes, 150) ?? "";
    }

    const label = getTextForElement(el, active);
    let sequence: number | undefined;
    if (label) {
      const match = label.match(/^(\d+)\./);
      if (match) sequence = parseInt(match[1], 10);
    }

    // Skip edges where either endpoint couldn't be resolved to a node —
    // these are typically annotation connector lines, not real data flows
    if (!fromId || !toId) continue;

    edges.push({
      id: el.id,
      from: fromId,
      to: toId,
      label: label || "",
      ...(sequence !== undefined ? { sequence } : {}),
    });
  }

  return edges;
}

/* ── Pass 3: Annotation association ─────────────────────────── */

/**
 * Build a map of element connections via arrows/lines.
 * For each element, returns the set of element IDs it's connected to.
 */
function buildConnectionMap(
  active: readonly ExcalidrawElement[],
): Map<string, Set<string>> {
  const connections = new Map<string, Set<string>>();

  const addConnection = (a: string, b: string) => {
    if (!a || !b) return;
    if (!connections.has(a)) connections.set(a, new Set());
    if (!connections.has(b)) connections.set(b, new Set());
    connections.get(a)!.add(b);
    connections.get(b)!.add(a);
  };

  for (const el of active) {
    if (el.type !== "arrow" && el.type !== "line") continue;
    const raw = el as Record<string, unknown>;
    const startId = (raw.startBinding as { elementId?: string } | null)?.elementId;
    const endId = (raw.endBinding as { elementId?: string } | null)?.elementId;
    if (startId && endId) {
      addConnection(startId, endId);
    }
  }

  return connections;
}

/**
 * Find the node an annotation is linked to.
 * Priority: 1) explicit arrow/line connection 2) nearest by distance
 */
function findLinkedNode(
  elementId: string,
  cx: number,
  cy: number,
  nodes: GraphNode[],
  connectionMap: Map<string, Set<string>>,
): string {
  const nodeIdSet = new Set(nodes.map((n) => n.id));

  // Check for explicit connections via arrows/lines
  const connected = connectionMap.get(elementId);
  if (connected) {
    // Find the connected element that is a known node
    for (const connId of connected) {
      if (nodeIdSet.has(connId)) return connId;
    }
    // Connected element might be a container that holds a node —
    // check if any connected element contains a node
    for (const connId of connected) {
      const innerConnections = connectionMap.get(connId);
      if (innerConnections) {
        for (const innerId of innerConnections) {
          if (nodeIdSet.has(innerId)) return innerId;
        }
      }
    }
  }

  // Fallback: nearest node by distance
  let nearestNodeId = "";
  let bestDist = Infinity;
  for (const node of nodes) {
    const ncx = node.position.x + node.dimensions.width / 2;
    const ncy = node.position.y + node.dimensions.height / 2;
    const dist = euclideanDistance(cx, cy, ncx, ncy);
    if (dist < bestDist) {
      bestDist = dist;
      nearestNodeId = node.id;
    }
  }
  return nearestNodeId;
}

function extractAnnotations(
  active: readonly ExcalidrawElement[],
  nodes: GraphNode[],
  connectionMap: Map<string, Set<string>>,
): GraphAnnotation[] {
  const annotations: GraphAnnotation[] = [];

  // Build set of text IDs that are bound to a container
  const boundTextIds = new Set<string>();
  for (const el of active) {
    const containerId = (el as Record<string, unknown>).containerId as
      | string
      | null
      | undefined;
    if (containerId && el.type === "text") {
      boundTextIds.add(el.id);
    }
  }

  for (const el of active) {
    if (isTemplateElement(el.id)) continue;
    if (el.type !== "text") continue;
    if (boundTextIds.has(el.id)) continue;
    if (!inHLD(el.x, el.y)) continue;

    const text = ((el as Record<string, unknown>).text as string) ?? "";
    if (!text.trim()) continue;

    const raw = el as Record<string, unknown>;
    const elCx = el.x + ((raw.width as number) ?? 0) / 2;
    const elCy = el.y + ((raw.height as number) ?? 0) / 2;

    const nearestNodeId = findLinkedNode(el.id, elCx, elCy, nodes, connectionMap);

    annotations.push({
      id: el.id,
      text: text.trim(),
      position: { x: el.x, y: el.y },
      nearestNodeId,
    });
  }

  return annotations;
}

/* ── Pass 4: Cluster detection ──────────────────────────────── */

// Detect container shapes that enclose 2+ other nodes.
// The container becomes a cluster; enclosed nodes become members.
function detectClusters(
  nodes: GraphNode[],
  active: readonly ExcalidrawElement[],
): { clusters: GraphCluster[]; updatedNodes: GraphNode[] } {
  const clusters: GraphCluster[] = [];
  const clusteredNodeIds = new Set<string>();

  // Find all HLD shapes that contain 2+ existing nodes within their bounds
  for (const el of active) {
    if (isTemplateElement(el.id)) continue;
    if (!SHAPE_TYPES.has(el.type)) continue;
    if (!inHLD(el.x, el.y)) continue;

    const raw = el as Record<string, unknown>;
    const cx = el.x;
    const cy = el.y;
    const cw = (raw.width as number) ?? 0;
    const ch = (raw.height as number) ?? 0;

    // Find nodes fully contained within this shape
    const members = nodes.filter((n) => {
      if (n.id === el.id) return false;
      return (
        n.position.x >= cx &&
        n.position.y >= cy &&
        n.position.x + n.dimensions.width <= cx + cw &&
        n.position.y + n.dimensions.height <= cy + ch
      );
    });

    if (members.length >= 2) {
      const label = getTextForElement(el, active);
      // Use the most common member label, or the container's own label
      const memberLabels = members.map((m) => m.label).filter(Boolean);
      const commonLabel = mostCommonString(memberLabels) || label || "(cluster)";

      clusters.push({
        id: el.id,
        label: commonLabel,
        count: members.length,
        memberIds: members.map((m) => m.id),
        position: { x: cx, y: cy },
        dimensions: { width: cw, height: ch },
      });

      for (const m of members) clusteredNodeIds.add(m.id);
    }
  }

  // Remove cluster container shapes from the nodes list (they're not components)
  const clusterIds = new Set(clusters.map((c) => c.id));
  const updatedNodes = nodes.filter((n) => !clusterIds.has(n.id));

  return { clusters, updatedNodes };
}

function mostCommonString(arr: string[]): string {
  if (arr.length === 0) return "";
  const counts = new Map<string, number>();
  for (const s of arr) counts.set(s, (counts.get(s) ?? 0) + 1);
  let best = "";
  let bestCount = 0;
  for (const [s, c] of counts) {
    if (c > bestCount) { best = s; bestCount = c; }
  }
  return best;
}

/* ── Main entry point ───────────────────────────────────────── */

export function parseDiagram(
  elements: readonly ExcalidrawElement[],
): ParsedDiagram {
  const active = elements.filter((e) => !e.isDeleted);

  const sections = extractSections(active);
  const { nodes: rawNodes, logicBoxes } = extractNodes(active);

  // Detect clusters (dotted boxes wrapping multiple instances)
  const { clusters, updatedNodes: nodes } = detectClusters(rawNodes, active);

  const edges = extractEdges(active, nodes);
  const connectionMap = buildConnectionMap(active);
  const annotations = extractAnnotations(active, nodes, connectionMap);

  // Merge logic description boxes into annotations
  for (const box of logicBoxes) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const nearestNodeId = findLinkedNode(box.id, cx, cy, nodes, connectionMap);
    annotations.push({
      id: box.id,
      text: box.label,
      position: { x: box.x, y: box.y },
      nearestNodeId,
    });
  }

  return {
    sections,
    hld: { nodes, edges, annotations, clusters },
  };
}
