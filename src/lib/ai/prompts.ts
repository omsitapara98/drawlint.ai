import type { ReviewLevel } from "@/types/feedback";

/* ── Shared ground rules ─────────────────────────────────────── */

const GROUND_RULES = `
GROUND RULES — READ CAREFULLY:
1. The Functional Requirements (FR) are the interview question. They are COMPLETE and GIVEN. Never say the requirements are incomplete or suggest clarifying them. Do NOT penalize for missing features that are NOT in the FR. If party/group matchmaking, social features, or any other capability is not listed in the FR, do not flag its absence as an issue.
2. The Assumptions section contains the candidate's stated constraints (user count, read/write ratio, SLA targets, etc.). Evaluate the design AGAINST these assumptions — not against arbitrary scale targets.
3. Judge HOW WELL the design meets the stated FR under the stated assumptions. A design for 10K users doesn't need the same infra as one for 10M users.
4. The candidate's annotations near components explain their design rationale. Factor this into your evaluation — they may have already considered and addressed concerns you'd raise.
5. Only flag a checklist criterion as missing if it is RELEVANT to this specific design AND required by the stated FR. For example: if the API has no list/GET endpoints, do not flag "missing pagination." If the API uses WebSocket, evaluate WebSocket message design (message types, payload structure, connection lifecycle) — do not apply REST conventions to WebSocket APIs. Judge what IS there, not what a generic template expects.
6. Do NOT invent requirements. If the FR says "match players 1v1", do not flag missing team/party support. If the FR says "text chat", do not flag missing voice/video. Stay strictly within the scope of the stated FR.
7. BE BRUTALLY HONEST. If the content is gibberish, random characters, placeholder text, or clearly low-effort, say so directly. Do NOT manufacture strengths or positives for empty or nonsensical content. An empty section deserves zero highlights. A section with "asdf123" or random text is NOT a valid design decision worth praising. If NOTHING is genuinely good, the highlights array MUST be empty.
8. Do NOT nitpick exact numbers. If the candidate says "99.9% availability" do not flag that it should be "99.99%". If capacity calculations show the right methodology and ballpark, do not argue about precise RAM overhead, exact shard counts, or specific node sizing. Focus on whether the APPROACH is sound, not whether the arithmetic is pixel-perfect. The Capacity section handles numerical accuracy — other reviewers should focus on design implications.
`;

/* ── Cumulative criteria per dimension ────────────────────────── */

const NFR_MID = [
  "Basic NFRs mentioned (latency, availability, consistency)",
];
const NFR_SENIOR = [
  ...NFR_MID,
  "NFRs specific with reasonable targets (e.g. \"p99 < 200ms\") — accept any defensible number, don't argue exact values",
  "Consistency model chosen (strong/eventual)",
  "Numbers tied to assumptions",
];
const NFR_STAFF = [
  ...NFR_SENIOR,
  "Trade-offs between NFRs discussed (consistency vs availability)",
  "NFRs inform architectural choices",
  "SLA contracts considered (general availability tiers, not exact decimal places)",
];
const NFR_DEEP = [
  ...NFR_STAFF,
  "Compliance requirements",
  "Multi-region latency budgets",
  "SLA composition across service dependencies",
];

const ENTITIES_MID = [
  "Key entities listed (1-word nouns relevant to the system)",
];
const ENTITIES_SENIOR = [
  ...ENTITIES_MID,
  "All entities needed for the core flow are present (no missing domain concepts)",
  "Relationships between entities defined (1:1, 1:N, N:N)",
];
const ENTITIES_STAFF = [
  ...ENTITIES_SENIOR,
  "Basic attributes present on each entity",
  "Read vs write access patterns identified",
  "Indexing strategy considered",
  "Data partitioning/sharding strategy",
  "Hot key awareness",
];
const ENTITIES_DEEP = [
  ...ENTITIES_STAFF,
  "Denormalization rationale discussed",
  "GDPR/data retention concerns",
  "Cross-region replication strategy",
  "Schema evolution plan",
];

const CAPACITY_MID = [
  "Basic numbers present (DAU, rough QPS)",
  "Right ballpark for scale — methodology matters more than exact values",
];
const CAPACITY_SENIOR = [
  ...CAPACITY_MID,
  "Calculations are methodical (DAU → QPS → storage → bandwidth)",
  "HLD generally consistent with calculated scale (don't nitpick exact node counts if the approach is sound)",
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
  "Resource-oriented URL design for REST endpoints (evaluate message types for WebSocket APIs)",
  "Pagination on list/GET endpoints (skip if no list endpoints exist)",
  "Proper HTTP verbs for REST endpoints (skip for pure WebSocket APIs)",
  "Error handling with status codes for REST; error message types for WebSocket",
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
  "Scalability approach handles stated load (focus on bottlenecks and failure modes, not exact sizing)",
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
  "Failure scenarios identified (what breaks, blast radius, recovery path)",
  "Single points of failure called out with mitigation",
  "Operational readiness (monitoring, alerting, logging)",
];
const HLD_DEEP = [
  ...HLD_STAFF,
  "Multi-region/disaster recovery",
  "Blue-green deployment strategy",
  "Chaos engineering readiness (failure injection points, blast radius boundaries)",
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

/* ── Per-reviewer prompts ──────────────────────────────────────── */

/** Section reviewer names matching multi-call flow */
export type ReviewerSection = "nfr" | "entities" | "capacity" | "api" | "hld";

const REVIEWER_NAMES: Record<ReviewerSection, string> = {
  nfr: "NFR Reviewer",
  entities: "Core Entities Reviewer",
  capacity: "Capacity Reviewer",
  api: "API Reviewer",
  hld: "HLD Reviewer",
};

const REVIEWER_FOCUS: Record<ReviewerSection, string> = {
  nfr: "non-functional requirements quality (latency targets, availability SLAs, consistency model). Do NOT comment on HLD component choices or infrastructure.",
  entities: "core domain entities and their relationships. At Mid/Senior level, focus ONLY on whether the right nouns are listed and relationships defined — do NOT demand attributes, fields, access patterns, indexing, or join/associative entities at these levels. Those are Staff+ criteria. Do NOT comment on infrastructure or API design.",
  capacity: "capacity calculations, projections, sizing, and whether numbers are methodical. Do NOT comment on component design or API routes.",
  api: "endpoint/message design, protocols, REST conventions or WebSocket patterns. Do NOT comment on backend architecture or data modeling.",
  hld: "component choices, architecture patterns, scalability, redundancy, and operational readiness. This is where infrastructure and design pattern feedback belongs. You will also receive other sections (NFR, Entities, Capacity, API) as cross-reference context. Use them to verify consistency — do NOT flag something as missing if it's addressed in another section.",
};

const INDIVIDUAL_RESPONSE_SCHEMA = `
Return a JSON object with this EXACT structure:

{
  "highlights": [
    {
      "severity": "strong" | "good",
      "title": "<short title>",
      "description": "<WHY this is a smart design choice>"
    }
  ],
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "title": "<short title>",
      "description": "<what's wrong and how to fix>"
    }
  ]
}`;

/**
 * Build a focused system prompt for a single section reviewer (multi-call mode).
 */
export function getReviewerPrompt(reviewer: ReviewerSection, level: ReviewLevel): string {
  const name = REVIEWER_NAMES[reviewer];
  const focus = REVIEWER_FOCUS[reviewer];
  const checklist = buildDimensionChecklist(level, reviewer);
  const label = LEVEL_LABELS[level];

  return `You are the ${name} on a system design interview panel. You are reviewing at ${label}.

${GROUND_RULES}

YOUR SOLE RESPONSIBILITY: ${focus}

SECTION OWNERSHIP: You are the ${name}. ONLY comment on your own section. Do not provide feedback on other dimensions.

YOUR CHECKLIST (${CRITERIA[level][reviewer].length} criteria — check each one):
${checklist}

CRITERIA ARE CUMULATIVE: Check ALL criteria from lower levels IN ADDITION to level-specific criteria. The checklist above already includes all accumulated criteria.

FEEDBACK — TWO SEPARATE ARRAYS:

"highlights" array — things done WELL (use "strong" or "good"):
- "strong": An exceptional design choice showing deep understanding. Use sparingly.
- "good": A solid, correct decision worth acknowledging.

"issues" array — things MISSING or WRONG (use "critical", "warning", or "info"):
- "critical": A fundamental issue that would cause the system to fail or not meet requirements.
- "warning": An important gap that should be addressed but doesn't break the system.
- "info": A minor suggestion or nice-to-have improvement.

Do NOT force highlights — if nothing stands out as genuinely good, leave the array empty.

RULES:
- Return ONLY valid JSON. No markdown fences, no explanation text outside the JSON.
- Every issues array must have at least one item if there is a relevant finding; use empty array only if no issues exist.
- Be constructive: explain WHY something is an issue and HOW to fix it.

${INDIVIDUAL_RESPONSE_SCHEMA}`;
}

const LEAD_REVIEWER_RESPONSE_SCHEMA = `
Return a JSON object with this EXACT structure:

{
  "summary": "<2-3 sentence overview of the entire design>",
  "leadReviewer": {
    "topStrengths": ["Strength 1", "Strength 2", "Strength 3"],
    "topRisks": ["Risk 1", "Risk 2", "Risk 3"],
    "signal": "strong-hire" | "hire" | "lean-hire" | "lean-no-hire" | "no-hire",
    "signalReason": "<brief justification for the hire signal>",
    "improvementAreas": ["Area 1", "Area 2"]
  },
  "followUpQuestions": ["Question 1?", "Question 2?"]
}`;

/**
 * Build the system prompt for the Lead Reviewer (multi-call mode).
 * The Lead Reviewer synthesizes the 5 individual reviewer summaries.
 */
export function getLeadReviewerPrompt(level: ReviewLevel): string {
  const label = LEVEL_LABELS[level];
  const desc = LEAD_DESCRIPTIONS[level];

  return `You are the Lead Reviewer on a system design interview panel. You are reviewing at ${label}.

${GROUND_RULES}

YOUR ROLE: You will receive the Functional Requirements, Assumptions, and the summaries from 5 specialist reviewers (NFR, Entities, Capacity, API, HLD). Synthesize their findings into an overall assessment.

${desc}

Provide:
1. A 2-3 sentence summary of the overall design quality
2. Your lead reviewer assessment (top strengths, top risks, hire signal with justification, improvement areas)
3. At least 2 follow-up questions that probe the candidate's understanding

RULES:
- Return ONLY valid JSON. No markdown fences, no explanation text outside the JSON.
- Base your assessment on the reviewer findings provided. Do not invent issues not mentioned by the reviewers.
- The hire signal should reflect the AGGREGATE quality across all dimensions.
- DO NOT manufacture strengths. If the design is empty, gibberish, or low-effort, topStrengths MUST be an empty array []. A "no-hire" signal is appropriate for designs with no real content. Never praise the mere existence of components if they have no meaningful labels, connections, or rationale.
- If most reviewer summaries report critical issues with empty or nonsensical content, the signal MUST be "no-hire".

${LEAD_REVIEWER_RESPONSE_SCHEMA}`;
}
