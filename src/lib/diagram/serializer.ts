import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  DiagramNode,
  DiagramConnection,
  SerializedDiagram,
} from "@/types/diagram";
import type { SectionContents } from "@/types/feedback";

type NodeType = DiagramNode["type"];

const KEYWORD_MAP: [RegExp, NodeType][] = [
  // Infrastructure
  [/\b(api[\s_-]?gateway)\b/i, "api-gateway"],
  [/\b(lb|load[\s_-]?balancer|nginx|haproxy|envoy|traefik)\b/i, "load-balancer"],
  [/\b(cdn|cloudfront|akamai|fastly|edge[\s_-]?cache)\b/i, "cdn"],
  [/\b(dns|route\s*53|name[\s_-]?server)\b/i, "dns"],
  [/\b(firewall|waf|security[\s_-]?group)\b/i, "firewall"],

  // Data stores
  [/\b(db|database|sql|mysql|mongo|postgres|dynamo|cockroach|aurora|rds|cassandra|spanner)\b/i, "database"],
  [/\b(cache|redis|memcached|elasticache)\b/i, "cache"],
  [/\b(s3|blob|storage|bucket|gcs|azure[\s_-]?blob|minio|object[\s_-]?store)\b/i, "storage"],

  // Messaging
  [/\b(kafka|rabbitmq|sqs|queue|amqp|activemq|celery|bull)\b/i, "queue"],
  [/\b(pub[\s_-]?sub|sns|event[\s_-]?bus|event[\s_-]?hub|nats|event[\s_-]?stream|notification)\b/i, "pubsub"],

  // Compute
  [/\b(worker|cron|job|scheduler|consumer|processor|daemon|batch)\b/i, "worker"],
  [/\b(server|instance|node|vm|container|pod)\b/i, "server"],
  [/\b(client|user|browser|mobile|frontend|app|player)\b/i, "client"],
];

export function getTextForElement(
  element: ExcalidrawElement,
  allElements: readonly ExcalidrawElement[],
): string {
  // 1. Check bound text (double-click binding via boundElements / containerId)
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

  // 2. Fallback: find standalone text overlapping this shape's bounds.
  //    Covers the case where a user placed a text element on top of a shape
  //    without using Excalidraw's built-in text binding.
  const raw = element as Record<string, unknown>;
  const ex = element.x;
  const ey = element.y;
  const ew = (raw.width as number) ?? 0;
  const eh = (raw.height as number) ?? 0;
  if (ew === 0 || eh === 0) return "";

  let bestText = "";
  let bestArea = 0;

  for (const el of allElements) {
    if (el.type !== "text") continue;
    if (el.isDeleted) continue;
    // Skip text already bound to another container
    const cid = (el as Record<string, unknown>).containerId as string | null | undefined;
    if (cid) continue;

    const tr = el as Record<string, unknown>;
    const tx = el.x;
    const ty = el.y;
    const tw = (tr.width as number) ?? 0;
    const th = (tr.height as number) ?? 0;

    // Calculate overlap area between shape and text
    const overlapX = Math.max(0, Math.min(ex + ew, tx + tw) - Math.max(ex, tx));
    const overlapY = Math.max(0, Math.min(ey + eh, ty + th) - Math.max(ey, ty));
    const overlapArea = overlapX * overlapY;
    const textArea = tw * th;

    // Text must overlap by at least 50% of its own area
    if (textArea > 0 && overlapArea / textArea >= 0.5 && overlapArea > bestArea) {
      bestArea = overlapArea;
      bestText = ((tr.text as string) ?? "").trim();
    }
  }

  return bestText;
}

export function classifyNode(
  shapeType: string,
  label: string,
): NodeType {
  if (!label) return "unknown";

  // Multi-line or long text blocks are logic descriptions, not component labels.
  const lineCount = label.split("\n").length;
  if (lineCount > 3 || label.length > 120) return "service";

  for (const [pattern, nodeType] of KEYWORD_MAP) {
    if (pattern.test(label)) return nodeType;
  }

  // Default: any labeled shape → service
  if (label.trim()) return "service";

  return "unknown";
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

export const SECTION_DEFS: {
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
