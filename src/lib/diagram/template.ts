/**
 * Creates the initial Excalidraw elements for a blank system-design whiteboard.
 *
 * Layout (all native Excalidraw rectangles + bound text):
 *
 *  Left column (x 20..430)             Right column (x 460..1160)
 *  ┌──────────────┬─────────┐          ┌──────────────────────────┐
 *  │ Functional   │ Assump- │          │                          │
 *  │ Requirements │ tions   │          │                          │
 *  │ (70%)        │ (30%)   │          │   High-Level Design      │
 *  ├──────────────┴─────────┤          │                          │
 *  │ Non-Functional         │          │                          │
 *  │ Requirements           │          │                          │
 *  ├────────────┬───────────┤          │                          │
 *  │ Core       │ Capacity  │          │                          │
 *  │ Entities   │ Calcul.   │          │                          │
 *  │ (50%)      │ (50%)     │          │                          │
 *  ├────────────┴───────────┤          │                          │
 *  │ API Routes             │          │                          │
 *  │                        │          │                          │
 *  └────────────────────────┘          └──────────────────────────┘
 */

// We deliberately use `any` for the element type because the full
// ExcalidrawElement shape is deeply internal and varies across versions.
// The returned objects satisfy the runtime contract Excalidraw expects.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = Record<string, any>;

function rng(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

let indexCounter = 0;
function nextIndex(): string {
  const idx = `a${indexCounter}`;
  indexCounter++;
  return idx;
}

function baseFields(overrides: Partial<AnyElement>): AnyElement {
  return {
    angle: 0,
    strokeColor: "#000000",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3, value: 32 },
    seed: rng(),
    version: 1,
    versionNonce: rng(),
    isDeleted: false,
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: true,
    ...overrides,
  };
}

function rect(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  textId: string,
): AnyElement {
  return baseFields({
    id,
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    index: nextIndex(),
    boundElements: [{ id: textId, type: "text" }],
  });
}

function text(
  id: string,
  label: string,
  containerId: string,
  containerX: number,
  containerY: number,
  containerW: number,
): AnyElement {
  return baseFields({
    id,
    type: "text",
    x: containerX + 20,
    y: containerY + 20,
    width: containerW - 40,
    height: 40,
    index: nextIndex(),
    strokeColor: "#000000",
    roundness: null,
    text: label,
    fontSize: 35,
    fontFamily: 3,
    textAlign: "left",
    verticalAlign: "top",
    containerId,
    originalText: label,
    autoResize: true,
    lineHeight: 1.25,
    boundElements: [],
  });
}

export function createWhiteboardTemplate(): AnyElement[] {
  // Reset counter each time we generate a template
  indexCounter = 0;

  const elements: AnyElement[] = [];

  // 2.5x scale, black borders. Left column width: 1250, HLD width: 2990

  // ── Row 1: Functional Requirements (80%) + Assumptions (20%) ──
  elements.push(rect("template-fr-rect", 38, 38, 949, 360, "template-fr-text"));
  elements.push(text("template-fr-text", "Functional Requirements", "template-fr-rect", 38, 38, 949));

  elements.push(rect("template-assumptions-rect", 999, 38, 289, 360, "template-assumptions-text"));
  elements.push(text("template-assumptions-text", "Assumptions", "template-assumptions-rect", 999, 38, 289));

  // ── Row 2: Non-Functional Requirements ──
  elements.push(rect("template-nfr-rect", 38, 423, 1250, 360, "template-nfr-text"));
  elements.push(text("template-nfr-text", "Non-Functional Requirements", "template-nfr-rect", 38, 423, 1250));

  // ── Row 3: Core Entities (50%) + Capacity Calculations (50%) ──
  elements.push(rect("template-entities-rect", 38, 808, 613, 250, "template-entities-text"));
  elements.push(text("template-entities-text", "Core Entities", "template-entities-rect", 38, 808, 613));

  elements.push(rect("template-capacity-rect", 663, 808, 625, 250, "template-capacity-text"));
  elements.push(text("template-capacity-text", "Capacity Calculations", "template-capacity-rect", 663, 808, 625));

  // ── Row 4: API Routes ──
  elements.push(rect("template-api-rect", 38, 1083, 1250, 760, "template-api-text"));
  elements.push(text("template-api-text", "API Routes", "template-api-rect", 38, 1083, 1250));

  // ── Right column: High-Level Design ──
  elements.push(rect("template-hld-rect", 1325, 38, 2990, 1805, "template-hld-text"));
  elements.push(text("template-hld-text", "High-Level Design", "template-hld-rect", 1325, 38, 2990));

  return elements;
}
