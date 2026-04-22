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
    strokeColor: "#c0c0c0",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3, value: 12 },
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
    x: containerX + 10,
    y: containerY + 10,
    width: containerW - 20,
    height: 20,
    index: nextIndex(),
    strokeColor: "#868e96",
    roundness: null,
    text: label,
    fontSize: 14,
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

  // ── Title text (standalone, not bound to a rectangle) ──
  elements.push(
    baseFields({
      id: "template-title",
      type: "text",
      x: 20,
      y: 20,
      width: 500,
      height: 30,
      index: nextIndex(),
      strokeColor: "#495057",
      roundness: null,
      text: "Enter your system design question...",
      fontSize: 24,
      fontFamily: 1,
      textAlign: "left",
      verticalAlign: "top",
      containerId: null,
      originalText: "Enter your system design question...",
      autoResize: true,
      lineHeight: 1.25,
      boundElements: [],
    }),
  );

  // ── Row 1: Functional Requirements (70%) + Assumptions (30%) ──
  elements.push(rect("template-fr-rect", 20, 80, 280, 160, "template-fr-text"));
  elements.push(text("template-fr-text", "Functional Requirements", "template-fr-rect", 20, 80, 280));

  elements.push(rect("template-assumptions-rect", 310, 80, 120, 160, "template-assumptions-text"));
  elements.push(text("template-assumptions-text", "Assumptions", "template-assumptions-rect", 310, 80, 120));

  // ── Row 2: Non-Functional Requirements ──
  elements.push(rect("template-nfr-rect", 20, 260, 410, 130, "template-nfr-text"));
  elements.push(text("template-nfr-text", "Non-Functional Requirements", "template-nfr-rect", 20, 260, 410));

  // ── Row 3: Core Entities (50%) + Capacity Calculations (50%) ──
  elements.push(rect("template-entities-rect", 20, 410, 200, 150, "template-entities-text"));
  elements.push(text("template-entities-text", "Core Entities", "template-entities-rect", 20, 410, 200));

  elements.push(rect("template-capacity-rect", 230, 410, 200, 150, "template-capacity-text"));
  elements.push(text("template-capacity-text", "Capacity Calculations", "template-capacity-rect", 230, 410, 200));

  // ── Row 4: API Routes ──
  elements.push(rect("template-api-rect", 20, 580, 410, 200, "template-api-text"));
  elements.push(text("template-api-text", "API Routes", "template-api-rect", 20, 580, 410));

  // ── Right column: High-Level Design ──
  elements.push(rect("template-hld-rect", 460, 80, 700, 700, "template-hld-text"));
  elements.push(text("template-hld-text", "High-Level Design", "template-hld-rect", 460, 80, 700));

  return elements;
}
