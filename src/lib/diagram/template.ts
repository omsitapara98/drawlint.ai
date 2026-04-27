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
  fontSize = 35,
  containerH?: number,
): AnyElement {
  // Estimate height from content: count newlines, multiply by fontSize * lineHeight
  const lineCount = label.split("\n").length;
  const estimatedHeight = containerH
    ? containerH - 40
    : Math.max(40, lineCount * fontSize * 1.25 + 10);

  return baseFields({
    id,
    type: "text",
    x: containerX + 20,
    y: containerY + 20,
    width: containerW - 40,
    height: estimatedHeight,
    index: nextIndex(),
    strokeColor: "#000000",
    roundness: null,
    text: label,
    fontSize,
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

/**
 * Word-wrap text to fit within a given character width.
 * Breaks long lines at word boundaries.
 */
function wordWrap(text: string, maxCharsPerLine: number): string {
  return text
    .split("\n")
    .map((line) => {
      if (line.length <= maxCharsPerLine) return line;
      const words = line.split(" ");
      const wrapped: string[] = [];
      let current = "";
      for (const word of words) {
        if (current.length === 0) {
          current = word;
        } else if (current.length + 1 + word.length <= maxCharsPerLine) {
          current += " " + word;
        } else {
          wrapped.push(current);
          current = "  " + word; // indent continuation lines
        }
      }
      if (current) wrapped.push(current);
      return wrapped.join("\n");
    })
    .join("\n");
}

/**
 * Count actual rendered lines after word-wrapping.
 */
function countRenderedLines(text: string, fontSize: number, boxInnerWidth: number): number {
  // Monospace font (fontFamily 3): char width ≈ fontSize * 0.6
  const charWidth = fontSize * 0.6;
  const maxChars = Math.floor(boxInnerWidth / charWidth);
  const wrapped = wordWrap(text, maxChars);
  return wrapped.split("\n").length;
}

/**
 * Creates a whiteboard template with pre-filled Functional Requirements and
 * Assumptions from challenge topic data. These sections are locked.
 */
export function createChallengeTemplate(
  requirements: string[],
  scale: string[],
): AnyElement[] {
  indexCounter = 0;

  const elements: AnyElement[] = [];

  // Layout constants
  const FR_FONT = 20;
  const ASS_FONT = 18;
  const PADDING = 40; // 20px each side
  const LINE_HEIGHT = 1.25;
  const FR_WIDTH = 750;
  const ASS_WIDTH = 488;
  const FR_INNER = FR_WIDTH - PADDING;
  const ASS_INNER = ASS_WIDTH - PADDING;

  // Calculate max chars per line for word-wrapping
  const frMaxChars = Math.floor(FR_INNER / (FR_FONT * 0.6));
  const assMaxChars = Math.floor(ASS_INNER / (ASS_FONT * 0.6));

  // Build content with word-wrapping
  const frRaw =
    "Functional Requirements\n\n" +
    requirements.map((r) => `• ${r}`).join("\n");
  const frContent = wordWrap(frRaw, frMaxChars);

  const assRaw =
    "Assumptions / Scale\n\n" +
    scale.map((s) => `• ${s}`).join("\n");
  const assumptionsContent = wordWrap(assRaw, assMaxChars);

  // Calculate heights from actual rendered line count
  const frLines = frContent.split("\n").length;
  const assLines = assumptionsContent.split("\n").length;
  const frHeight = Math.max(360, frLines * Math.ceil(FR_FONT * LINE_HEIGHT) + 60);
  const assHeight = Math.max(360, assLines * Math.ceil(ASS_FONT * LINE_HEIGHT) + 60);
  const row1Height = Math.max(frHeight, assHeight);

  // ── Row 1: FR (pre-filled) + Assumptions (pre-filled) ──
  elements.push(rect("template-fr-rect", 38, 38, FR_WIDTH, row1Height, "template-fr-text"));
  elements.push(text("template-fr-text", frContent, "template-fr-rect", 38, 38, FR_WIDTH, FR_FONT, row1Height));

  const assX = 38 + FR_WIDTH + 12;
  elements.push(rect("template-assumptions-rect", assX, 38, ASS_WIDTH, row1Height, "template-assumptions-text"));
  elements.push(text("template-assumptions-text", assumptionsContent, "template-assumptions-rect", assX, 38, ASS_WIDTH, ASS_FONT, row1Height));

  const row2Y = 38 + row1Height + 25;

  // ── Row 2: Non-Functional Requirements (empty — user fills) ──
  elements.push(rect("template-nfr-rect", 38, row2Y, 1250, 360, "template-nfr-text"));
  elements.push(text("template-nfr-text", "Non-Functional Requirements", "template-nfr-rect", 38, row2Y, 1250));

  const row3Y = row2Y + 360 + 25;

  // ── Row 3: Core Entities + Capacity Calculations (empty) ──
  elements.push(rect("template-entities-rect", 38, row3Y, 613, 250, "template-entities-text"));
  elements.push(text("template-entities-text", "Core Entities", "template-entities-rect", 38, row3Y, 613));

  elements.push(rect("template-capacity-rect", 663, row3Y, 625, 250, "template-capacity-text"));
  elements.push(text("template-capacity-text", "Capacity Calculations", "template-capacity-rect", 663, row3Y, 625));

  const row4Y = row3Y + 250 + 25;

  // ── Row 4: API Routes (empty) ──
  elements.push(rect("template-api-rect", 38, row4Y, 1250, 760, "template-api-text"));
  elements.push(text("template-api-text", "API Routes", "template-api-rect", 38, row4Y, 1250));

  const totalLeftHeight = row4Y + 760 - 38;

  // ── Right column: High-Level Design (empty, matches left column height) ──
  elements.push(rect("template-hld-rect", 1325, 38, 2990, totalLeftHeight, "template-hld-text"));
  elements.push(text("template-hld-text", "High-Level Design", "template-hld-rect", 1325, 38, 2990));

  return elements;
}
