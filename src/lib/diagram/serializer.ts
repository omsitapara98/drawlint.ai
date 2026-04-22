import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  DiagramNode,
  DiagramConnection,
  SerializedDiagram,
} from "@/types/diagram";

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
