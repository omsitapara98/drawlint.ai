import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  DiagramNode,
  DiagramConnection,
  SerializedDiagram,
} from "@/types/diagram";
import type { SectionContents } from "@/types/feedback";

type NodeType = DiagramNode["type"];

const KEYWORD_MAP: [RegExp, NodeType][] = [
  [/\b(db|database|sql|mongo|postgres|redis|dynamo)\b/i, "database"],
  [/\b(queue|kafka|rabbitmq|sqs)\b/i, "queue"],
  [/\b(cache|redis|memcached)\b/i, "cache"],
  [/\b(lb|load\s*balancer|nginx|haproxy)\b/i, "load-balancer"],
  [/\b(client|user|browser|mobile)\b/i, "client"],
  [/\b(s3|blob|storage|bucket)\b/i, "storage"],
];

function getTextForElement(
  element: ExcalidrawElement,
  allElements: readonly ExcalidrawElement[],
): string {
  // Excalidraw binds text to containers via boundElements / containerId
  const bound = (element as Record<string, unknown>).boundElements as
    | readonly { id: string; type: string }[]
    | null
    | undefined;

  if (bound) {
    for (const ref of bound) {
      if (ref.type === "text") {
        const textEl = allElements.find((e) => e.id === ref.id);
        if (textEl && textEl.type === "text") {
          return ((textEl as Record<string, unknown>).text as string) ?? "";
        }
      }
    }
  }
  return "";
}

function classifyNode(
  shapeType: string,
  label: string,
): NodeType {
  if (!label) return "unknown";

  for (const [pattern, nodeType] of KEYWORD_MAP) {
    // Some types are shape-sensitive
    if (nodeType === "database") {
      if (
        (shapeType === "rectangle" || shapeType === "diamond") &&
        pattern.test(label)
      )
        return "database";
    } else if (nodeType === "load-balancer") {
      if (
        (shapeType === "ellipse" || shapeType === "diamond") &&
        pattern.test(label)
      )
        return "load-balancer";
    } else if (shapeType === "rectangle" && pattern.test(label)) {
      return nodeType;
    }
  }

  // Default: labeled rectangle → service
  if (shapeType === "rectangle") return "service";

  // For non-rectangle shapes with text but no keyword match, still treat as service
  return "service";
}

const SHAPE_TYPES = new Set(["rectangle", "diamond", "ellipse"]);

export function serializeDiagram(
  elements: readonly ExcalidrawElement[],
): SerializedDiagram {
  const active = elements.filter((e) => !e.isDeleted);

  const nodes: DiagramNode[] = [];
  const connections: DiagramConnection[] = [];

  for (const el of active) {
    if (SHAPE_TYPES.has(el.type)) {
      const label = getTextForElement(el, active);
      const nodeType = classifyNode(el.type, label);
      nodes.push({
        id: el.id,
        type: nodeType,
        label: label || "",
        position: { x: el.x, y: el.y },
      });
    } else if (el.type === "arrow" || el.type === "line") {
      const arrow = el as Record<string, unknown>;
      const startBinding = arrow.startBinding as
        | { elementId: string }
        | null
        | undefined;
      const endBinding = arrow.endBinding as
        | { elementId: string }
        | null
        | undefined;

      const fromId = startBinding?.elementId ?? "";
      const toId = endBinding?.elementId ?? "";

      const arrowLabel = getTextForElement(el, active);

      connections.push({
        id: el.id,
        from: fromId,
        to: toId,
        ...(arrowLabel ? { label: arrowLabel } : {}),
      });
    }
  }

  return {
    nodes,
    connections,
    rawElementCount: elements.length,
    timestamp: Date.now(),
  };
}

/* ── Section extraction for local preview ─────────────────────── */

const SECTION_DEFS: {
  rectId: string;
  textId: string;
  key: keyof SectionContents;
}[] = [
  { rectId: "template-fr-rect", textId: "template-fr-text", key: "functionalRequirements" },
  { rectId: "template-assumptions-rect", textId: "template-assumptions-text", key: "assumptions" },
  { rectId: "template-nfr-rect", textId: "template-nfr-text", key: "nonFunctionalRequirements" },
  { rectId: "template-entities-rect", textId: "template-entities-text", key: "coreEntities" },
  { rectId: "template-capacity-rect", textId: "template-capacity-text", key: "capacityCalculations" },
  { rectId: "template-api-rect", textId: "template-api-text", key: "apiRoutes" },
  { rectId: "template-hld-rect", textId: "template-hld-text", key: "hld" },
];

/**
 * Extract user content from each template section rectangle.
 * Captures shapes (rectangle, ellipse, diamond) with their bound text labels,
 * plus standalone text elements. Uses the parent shape's position for bound
 * text to prevent cross-section bleeding.
 */
export function extractSectionContents(
  elements: readonly ExcalidrawElement[],
): SectionContents {
  const active = elements.filter((e) => !e.isDeleted);

  const result: SectionContents = {
    functionalRequirements: "",
    assumptions: "",
    nonFunctionalRequirements: "",
    coreEntities: "",
    capacityCalculations: "",
    apiRoutes: "",
    hld: "",
  };

  const templateIds = new Set(
    SECTION_DEFS.flatMap((s) => [s.rectId, s.textId]),
  );

  // Build a set of text IDs bound to a container so we skip them
  // during standalone text scanning (they're captured via their parent shape)
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

  for (const section of SECTION_DEFS) {
    const rectEl = active.find((e) => e.id === section.rectId);
    if (!rectEl) continue;

    const rx = rectEl.x;
    const ry = rectEl.y;
    const rw = (rectEl as Record<string, unknown>).width as number;
    const rh = (rectEl as Record<string, unknown>).height as number;

    const inBounds = (ex: number, ey: number) =>
      ex >= rx && ex <= rx + rw && ey >= ry && ey <= ry + rh;

    const collected: string[] = [];

    // 1. Shapes (rectangle, ellipse, diamond) within bounds → get bound text labels
    for (const el of active) {
      if (templateIds.has(el.id)) continue;
      if (!["rectangle", "ellipse", "diamond"].includes(el.type)) continue;
      if (!inBounds(el.x, el.y)) continue;

      const label = getTextForElement(el, active);
      if (label.trim()) collected.push(label.trim());
    }

    // 2. Standalone text (not bound to any shape) within bounds
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

  return result;
}
