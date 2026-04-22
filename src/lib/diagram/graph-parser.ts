import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  ParsedDiagram,
  GraphNode,
  GraphEdge,
  GraphAnnotation,
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

/* ── Pass 1: Node extraction ────────────────────────────────── */

function extractNodes(
  active: readonly ExcalidrawElement[],
): GraphNode[] {
  const nodes: GraphNode[] = [];

  for (const el of active) {
    if (isTemplateElement(el.id)) continue;
    if (!SHAPE_TYPES.has(el.type)) continue;
    if (!inHLD(el.x, el.y)) continue;

    const label = getTextForElement(el, active);
    const nodeType = classifyNode(el.type, label);
    const raw = el as Record<string, unknown>;

    nodes.push({
      id: el.id,
      label: label || "",
      type: nodeType,
      position: { x: el.x, y: el.y },
      dimensions: {
        width: (raw.width as number) ?? 0,
        height: (raw.height as number) ?? 0,
      },
      style: {
        strokeColor: (raw.strokeColor as string) ?? "#000000",
        backgroundColor: (raw.backgroundColor as string) ?? "transparent",
      },
    });
  }

  return nodes;
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

function extractAnnotations(
  active: readonly ExcalidrawElement[],
  nodes: GraphNode[],
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

    // Find nearest node by center-to-center distance
    let nearestNodeId = "";
    let bestDist = Infinity;
    const raw = el as Record<string, unknown>;
    const elCx = el.x + ((raw.width as number) ?? 0) / 2;
    const elCy = el.y + ((raw.height as number) ?? 0) / 2;

    for (const node of nodes) {
      const ncx = node.position.x + node.dimensions.width / 2;
      const ncy = node.position.y + node.dimensions.height / 2;
      const dist = euclideanDistance(elCx, elCy, ncx, ncy);
      if (dist < bestDist) {
        bestDist = dist;
        nearestNodeId = node.id;
      }
    }

    annotations.push({
      id: el.id,
      text: text.trim(),
      position: { x: el.x, y: el.y },
      nearestNodeId,
    });
  }

  return annotations;
}

/* ── Main entry point ───────────────────────────────────────── */

export function parseDiagram(
  elements: readonly ExcalidrawElement[],
): ParsedDiagram {
  const active = elements.filter((e) => !e.isDeleted);

  const sections = extractSections(active);
  const nodes = extractNodes(active);
  const edges = extractEdges(active, nodes);
  const annotations = extractAnnotations(active, nodes);

  return {
    sections,
    hld: { nodes, edges, annotations },
  };
}
