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
    x: containerX + 20,
    y: containerY + 20,
    width: containerW - 40,
    height: 40,
    index: nextIndex(),
    strokeColor: "#495057",
    roundness: null,
    text: label,
    fontSize: 28,
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

  // Scaled 2x, vertical reduced 20%. Total canvas: ~2900 x 1600
  // Left column width: 1000, Right column width: 1840

  // ── Title bar (rectangle + bound text) ──
  elements.push(rect("template-title-rect", 30, 30, 2870, 64, "template-title-text"));
  elements.push(
    baseFields({
      id: "template-title-text",
      type: "text",
      x: 50,
      y: 40,
      width: 2830,
      height: 44,
      index: nextIndex(),
      strokeColor: "#495057",
      roundness: null,
      text: "Title: ",
      fontSize: 36,
      fontFamily: 3,
      textAlign: "left",
      verticalAlign: "top",
      containerId: "template-title-rect",
      originalText: "Title: ",
      autoResize: true,
      lineHeight: 1.25,
      boundElements: [],
    }),
  );

  // Left column: x 30..1030 (width 1000)
  // Right column: x 1060..2900 (width 1840)

  // ── Row 1: Functional Requirements (80%) + Assumptions (20%) — same height as NFR ──
  elements.push(rect("template-fr-rect", 30, 114, 759, 288, "template-fr-text"));
  elements.push(text("template-fr-text", "Functional Requirements", "template-fr-rect", 30, 114, 759));

  elements.push(rect("template-assumptions-rect", 799, 114, 231, 288, "template-assumptions-text"));
  elements.push(text("template-assumptions-text", "Assumptions", "template-assumptions-rect", 799, 114, 231));

  // ── Row 2: Non-Functional Requirements ──
  elements.push(rect("template-nfr-rect", 30, 422, 1000, 288, "template-nfr-text"));
  elements.push(text("template-nfr-text", "Non-Functional Requirements", "template-nfr-rect", 30, 422, 1000));

  // ── Row 3: Core Entities (50%) + Capacity Calculations (50%) ──
  elements.push(rect("template-entities-rect", 30, 730, 490, 200, "template-entities-text"));
  elements.push(text("template-entities-text", "Core Entities", "template-entities-rect", 30, 730, 490));

  elements.push(rect("template-capacity-rect", 530, 730, 500, 200, "template-capacity-text"));
  elements.push(text("template-capacity-text", "Capacity Calculations", "template-capacity-rect", 530, 730, 500));

  // ── Row 4: API Routes — taller with freed space ──
  elements.push(rect("template-api-rect", 30, 950, 1000, 608, "template-api-text"));
  elements.push(text("template-api-text", "API Routes", "template-api-rect", 30, 950, 1000));

  // ── Right column: High-Level Design ──
  elements.push(rect("template-hld-rect", 1060, 114, 1840, 1444, "template-hld-text"));
  elements.push(text("template-hld-text", "High-Level Design", "template-hld-rect", 1060, 114, 1840));

  return elements;
}
