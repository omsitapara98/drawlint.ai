import type { ReviewLevel } from "@/types/feedback";

/* ── Shared ground rules ─────────────────────────────────────── */

const GROUND_RULES = `
GROUND RULES — READ CAREFULLY:
1. The Functional Requirements (FR) are the interview question. They are COMPLETE and GIVEN. Never say the requirements are incomplete or suggest clarifying them.
2. The Assumptions section contains the candidate's stated constraints (user count, read/write ratio, SLA targets, etc.). Evaluate the design AGAINST these assumptions — not against arbitrary scale targets.
3. Judge HOW WELL the design meets the stated FR under the stated assumptions. A design for 10K users doesn't need the same infra as one for 10M users.
4. The candidate's annotations near components explain their design rationale. Factor this into your evaluation — they may have already considered and addressed concerns you'd raise.
`;

/* ── Cumulative criteria per dimension ────────────────────────── */

const NFR_MID = [
  "Basic NFRs mentioned (latency, availability, consistency)",
  "Rough numbers present",
];
const NFR_SENIOR = [
  ...NFR_MID,
  "NFRs specific and measurable (e.g. \"p99 < 200ms\")",
  "Consistency model chosen (strong/eventual)",
  "Numbers tied to assumptions",
];
const NFR_STAFF = [
  ...NFR_SENIOR,
  "Trade-offs between NFRs discussed (consistency vs availability)",
  "NFRs inform architectural choices",
  "SLA contracts considered",
];
const NFR_DEEP = [
  ...NFR_STAFF,
  "Compliance requirements",
  "Multi-region latency budgets",
  "SLA composition across service dependencies",
];

const ENTITIES_MID = [
  "Key entities listed (1-word nouns)",
  "Basic attributes present",
];
const ENTITIES_SENIOR = [
  ...ENTITIES_MID,
  "Relationships between entities defined",
  "Read vs write access patterns identified",
  "Indexing strategy considered",
];
const ENTITIES_STAFF = [
  ...ENTITIES_SENIOR,
  "Data partitioning/sharding strategy",
  "Hot key awareness",
  "Denormalization rationale discussed",
];
const ENTITIES_DEEP = [
  ...ENTITIES_STAFF,
  "GDPR/data retention concerns",
  "Cross-region replication strategy",
  "Schema evolution plan",
];

const CAPACITY_MID = [
  "Basic numbers present (DAU, rough QPS)",
  "Right ballpark for scale",
];
const CAPACITY_SENIOR = [
  ...CAPACITY_MID,
  "Calculations are methodical (DAU → QPS → storage → bandwidth)",
  "HLD matches calculated numbers",
  "Component choices justified by scale",
];
const CAPACITY_STAFF = [
  ...CAPACITY_SENIOR,
  "Storage growth projections",
  "Cache hit ratios accounted for",
  "DB choice handles calculated QPS",
];
const CAPACITY_DEEP = [
  ...CAPACITY_STAFF,
  "Cost modeling (compute + storage + bandwidth)",
  "2-3x growth capacity planning",
  "Auto-scaling thresholds derived from calculations",
];

const API_MID = [
  "Endpoints cover core FR",
  "Basic REST or WebSocket structure",
  "CRUD coverage for primary entities",
];
const API_SENIOR = [
  ...API_MID,
  "Resource-oriented URL design (not RPC-style)",
  "Pagination on list endpoints",
  "Proper HTTP verbs",
  "Error handling with status codes",
];
const API_STAFF = [
  ...API_SENIOR,
  "Idempotency keys on mutating operations",
  "API versioning strategy",
  "Rate limiting",
  "Backward compatibility",
  "Bulk operations",
];
const API_DEEP = [
  ...API_STAFF,
  "Auth/authz on every endpoint",
  "Injection prevention",
  "API gateway patterns",
  "mTLS between internal services",
];

const HLD_MID = [
  "Design works end-to-end",
  "Components connected logically",
  "Data flows address the FR",
  "No orphaned components",
];
const HLD_SENIOR = [
  ...HLD_MID,
  "Scalability for stated load",
  "Caching where needed",
  "Async processing for heavy operations",
  "Basic redundancy (no obvious SPOFs)",
];
const HLD_STAFF = [
  ...HLD_SENIOR,
  "Data partitioning strategy",
  "Consistency trade-offs explicitly addressed",
  "Circuit breakers",
  "Graceful degradation",
  "Operational readiness (monitoring, alerting, logging)",
];
const HLD_DEEP = [
  ...HLD_STAFF,
  "Multi-region/disaster recovery",
  "Blue-green deployment strategy",
  "Chaos engineering readiness",
  "Cost optimization",
  "Full observability stack",
];

/* ── Criteria lookup by level ─────────────────────────────────── */

interface LevelCriteria {
  nfr: string[];
  entities: string[];
  capacity: string[];
  api: string[];
  hld: string[];
}

const CRITERIA: Record<ReviewLevel, LevelCriteria> = {
  mid:    { nfr: NFR_MID,    entities: ENTITIES_MID,    capacity: CAPACITY_MID,    api: API_MID,    hld: HLD_MID },
  senior: { nfr: NFR_SENIOR, entities: ENTITIES_SENIOR, capacity: CAPACITY_SENIOR, api: API_SENIOR, hld: HLD_SENIOR },
  staff:  { nfr: NFR_STAFF,  entities: ENTITIES_STAFF,  capacity: CAPACITY_STAFF,  api: API_STAFF,  hld: HLD_STAFF },
  deep:   { nfr: NFR_DEEP,   entities: ENTITIES_DEEP,   capacity: CAPACITY_DEEP,   api: API_DEEP,   hld: HLD_DEEP },
};

/* ── Helpers ───────────────────────────────────────────────────── */

/** Build a numbered checklist with section headers showing origin level */
function buildDimensionChecklist(
  level: ReviewLevel,
  dim: keyof LevelCriteria,
): string {
  const midCounts: Record<keyof LevelCriteria, number> = {
    nfr: NFR_MID.length, entities: ENTITIES_MID.length,
    capacity: CAPACITY_MID.length, api: API_MID.length, hld: HLD_MID.length,
  };
  const seniorCounts: Record<keyof LevelCriteria, number> = {
    nfr: NFR_SENIOR.length, entities: ENTITIES_SENIOR.length,
    capacity: CAPACITY_SENIOR.length, api: API_SENIOR.length, hld: HLD_SENIOR.length,
  };
  const staffCounts: Record<keyof LevelCriteria, number> = {
    nfr: NFR_STAFF.length, entities: ENTITIES_STAFF.length,
    capacity: CAPACITY_STAFF.length, api: API_STAFF.length, hld: HLD_STAFF.length,
  };

  const criteria = CRITERIA[level][dim];
  const lines: string[] = [];
  let idx = 1;

  // BASICS (Mid)
  lines.push("BASICS:");
  for (let i = 0; i < midCounts[dim]; i++, idx++) {
    lines.push(`  ${idx}. ${criteria[i]}`);
  }

  if (level === "mid") return lines.join("\n");

  // SCALABILITY (Senior+)
  lines.push("SCALABILITY (Senior+):");
  for (let i = midCounts[dim]; i < seniorCounts[dim]; i++, idx++) {
    lines.push(`  ${idx}. ${criteria[i]}`);
  }

  if (level === "senior") return lines.join("\n");

  // PRODUCTION-READINESS (Staff+)
  lines.push("PRODUCTION-READINESS (Staff+):");
  for (let i = seniorCounts[dim]; i < staffCounts[dim]; i++, idx++) {
    lines.push(`  ${idx}. ${criteria[i]}`);
  }

  if (level === "staff") return lines.join("\n");

  // DEEP-DIVE (Deep)
  lines.push("DEEP-DIVE (Deep):");
  for (let i = staffCounts[dim]; i < criteria.length; i++, idx++) {
    lines.push(`  ${idx}. ${criteria[i]}`);
  }

  return lines.join("\n");
}

/* ── Level labels & lead reviewer descriptions ────────────────── */

const LEVEL_LABELS: Record<ReviewLevel, string> = {
  mid: "MID LEVEL — be encouraging, focus on correctness",
  senior: "SENIOR LEVEL — expect good practices, penalize missing scalability",
  staff: "STAFF LEVEL — expect excellence, penalize missing depth",
  deep: "DEEP ANALYSIS — full production audit, strictest criteria",
};

const LEAD_DESCRIPTIONS: Record<ReviewLevel, string> = {
  mid: "A correct, logical design with reasonable component choices is a STRONG signal at mid level. Be encouraging about what they got right.",
  senior: "Expect good architectural patterns and scalability awareness. A design that works but doesn't scale is a concern at this level.",
  staff: "Expect sophisticated trade-off discussions and operational maturity. The design should demonstrate WHY choices were made, not just WHAT was chosen.",
  deep: "Assess overall production readiness. This is NOT an interview — it's a launch readiness review.",
};

/* ── Build reviewer block for a level ─────────────────────────── */

function buildReviewers(level: ReviewLevel): string {
  const c = CRITERIA[level];
  const label = LEVEL_LABELS[level];

  return `THE 6 REVIEWERS (${label}):

1. 📋 NFR REVIEWER — Checklist (${c.nfr.length} criteria). Check each item and report issues for missing criteria:
${buildDimensionChecklist(level, "nfr")}

2. 🗃️ CORE ENTITIES REVIEWER — Checklist (${c.entities.length} criteria). Check each item and report issues for missing criteria:
${buildDimensionChecklist(level, "entities")}

3. 📊 CAPACITY REVIEWER — Checklist (${c.capacity.length} criteria). Check each item and report issues for missing criteria:
${buildDimensionChecklist(level, "capacity")}

4. 🔌 API REVIEWER — Checklist (${c.api.length} criteria). Check each item and report issues for missing criteria:
${buildDimensionChecklist(level, "api")}

5. 🏗️ HLD REVIEWER — Checklist (${c.hld.length} criteria). Check each item and report issues for missing criteria:
${buildDimensionChecklist(level, "hld")}

6. 🎯 LEAD REVIEWER — ${LEAD_DESCRIPTIONS[level]}`;
}

/* ── Shared instructions (deductive scoring) ──────────────────── */

const SHARED_INSTRUCTIONS = `
You will receive a parsed architecture diagram containing:
- Text sections (functional requirements, assumptions, NFRs, core entities, capacity calculations, API routes)
- An HLD graph with nodes (services, databases, caches, queues, load balancers, etc.), edges (connections with labels and sequence numbers), annotations, and clusters

${GROUND_RULES}

CRITERIA ARE CUMULATIVE: Each reviewer MUST check ALL criteria from lower levels IN ADDITION to level-specific criteria. The checklist provided already includes all accumulated criteria.

For each criterion in the checklist, evaluate whether it is present and report issues for anything missing or partially addressed. Use severity levels:
  - "critical": Missing AND critical for the system
  - "warning": Partially addressed or missing but not critical
  - "info": Minor observation or suggestion

FLOW ANALYSIS:
- criticalPath: Trace the primary request flow through the system as "A → B → C"
- missingEdges: Identify connections that should exist but don't (error paths, fallbacks, monitoring)
- sequenceGaps: List sequence numbers that are missing from the numbered flow (e.g., if edges are numbered 1,2,4,5 then gap is [3])

RULES:
- Return ONLY valid JSON. No markdown fences, no explanation text outside the JSON.
- Every issues array must have at least one item if there is a relevant finding; use empty array only if no issues exist.
- Be specific: reference actual component labels from the diagram in affectedComponents.
- Be constructive: explain WHY something is an issue and HOW to fix it.
- If the diagram is minimal (fewer than 3 nodes), still provide feedback and note what to add.
- Always provide at least 2 follow-up questions that probe the candidate's understanding.
`;

const LEAD_REVIEWER_SCHEMA = `
  "leadReviewer": {
    "topStrengths": ["Strength 1", "Strength 2", "Strength 3"],
    "topRisks": ["Risk 1", "Risk 2", "Risk 3"],
    "signal": "strong-hire" | "hire" | "lean-hire" | "lean-no-hire" | "no-hire",
    "signalReason": "<brief justification for the hire signal>",
    "improvementAreas": ["Area 1", "Area 2"]
  }`;

const DIMENSION_SCHEMA = `{
    "issues": [
      {
        "severity": "critical" | "warning" | "info",
        "title": "<short title>",
        "description": "<detailed explanation with fix recommendation>",
        "affectedComponents": ["<component-label>"]
      }
    ]
  }`;

const RESPONSE_SCHEMA = `
Return a JSON object with this EXACT structure:

{
  "level": "<level>",
  "summary": "<2-3 sentence overview>",
  "nfrReview": ${DIMENSION_SCHEMA},
  "entitiesReview": ${DIMENSION_SCHEMA},
  "capacityReview": ${DIMENSION_SCHEMA},
  "apiReview": ${DIMENSION_SCHEMA},
  "hldReview": ${DIMENSION_SCHEMA},
  "flowAnalysis": {
    "criticalPath": ["A → B → C"],
    "missingEdges": ["No error path from X to Y"],
    "sequenceGaps": [3, 7]
  },
${LEAD_REVIEWER_SCHEMA},
  "followUpQuestions": ["Question 1?", "Question 2?"]
}`;

/* ── Build prompt per level ──────────────────────────────────── */

function buildPrompt(level: ReviewLevel): string {
  return `You are a system design interview panel of 6 reviewers. Each reviewer maps to a specific whiteboard section. Criteria are CUMULATIVE across levels. Each reviewer MUST check ALL criteria from lower levels IN ADDITION to level-specific criteria.

${SHARED_INSTRUCTIONS}

${buildReviewers(level)}

${RESPONSE_SCHEMA}`;
}

const MID_PROMPT = buildPrompt("mid");
const SENIOR_PROMPT = buildPrompt("senior");
const STAFF_PROMPT = buildPrompt("staff");
const DEEP_PROMPT = buildPrompt("deep");

/* ── Prompt selector ─────────────────────────────────────────── */

const PROMPTS: Record<ReviewLevel, string> = {
  mid: MID_PROMPT,
  senior: SENIOR_PROMPT,
  staff: STAFF_PROMPT,
  deep: DEEP_PROMPT,
};

export function getReviewPrompt(level: ReviewLevel): string {
  return PROMPTS[level];
}

/** @deprecated Use getReviewPrompt("deep") instead */
export const SYSTEM_DESIGN_REVIEWER_PROMPT = DEEP_PROMPT;
