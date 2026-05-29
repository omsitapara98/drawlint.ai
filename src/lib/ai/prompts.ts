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
9. The candidate's EXPLANATION (a separate written walkthrough, shown as "CANDIDATE'S EXPLANATION" when present) is FIRST-CLASS design evidence — weigh it equally with what is drawn. If the explanation SPECIFICALLY and SUBSTANTIVELY addresses a concern with a concrete mechanism (e.g. "Redis runs HA via Sentinel with automatic failover"), do NOT flag that concern as missing just because it is not on the diagram. BUT vague or hand-wavy claims ("it's highly available", "it scales", "we'll cache it") earn NO credit — require a specific mechanism. Only credit explanation content relevant to YOUR section.
`;

/* ── Cumulative criteria per dimension ────────────────────────── */

const NFR_MID = [
  "Are basic quality attributes identified? (latency, availability, consistency — at least mentioned)",
];
const NFR_SENIOR = [
  ...NFR_MID,
  "Are targets reasonable and defensible? (e.g. 'p99 < 200ms' — any concrete number is fine, don't argue the exact value)",
  "Is the consistency model chosen and justified? (strong vs eventual — what breaks if you pick wrong?)",
  "Do the numbers connect to the assumptions? (not floating in isolation)",
];
const NFR_STAFF = [
  ...NFR_SENIOR,
  "Are trade-offs between NFRs discussed? (e.g. 'we sacrifice consistency for availability because...')",
  "Do NFR choices actually drive architecture decisions? (not just listed and forgotten)",
  "What happens when SLAs are breached? (any degradation story?)",
];
const NFR_DEEP = [
  ...NFR_STAFF,
  "Are compliance/regulatory constraints considered where relevant?",
  "Is there a latency budget across the request path? (not just endpoint targets)",
  "How do dependent service SLAs compose? (if Service A is 99.9% and Service B is 99.9%, what's the user-facing SLA?)",
];

const ENTITIES_MID = [
  "Are the core domain nouns identified? (the 3-5 key entities this system revolves around)",
];
const ENTITIES_SENIOR = [
  ...ENTITIES_MID,
  "Are all entities needed for the core flow present? (trace the happy path — is any domain concept missing?)",
  "Are relationships defined? (1:1, 1:N, N:N — how do these things connect?)",
];
const ENTITIES_STAFF = [
  ...ENTITIES_SENIOR,
  "Are the query-relevant fields reasoned about? (the fields that matter for queries and indexes — prose is fine, no formal schema required)",
  "What's the hottest read path? Can the DB serve it efficiently? (think about access patterns, not just schema)",
  "Is there a sharding/partitioning key? What happens if it's wrong? (hot partitions, cross-shard queries)",
  "Are there any hot keys or skewed access patterns? (celebrity problem, popular items)",
];
const ENTITIES_DEEP = [
  ...ENTITIES_STAFF,
  "Is denormalization justified where used? (what's the read/write trade-off?)",
  "Are data retention and deletion policies considered? (GDPR, TTL, archival)",
  "How does schema evolve? (migrations, backward compatibility, dual-write periods)",
  "Is cross-region data replication addressed if multi-region?",
];

const CAPACITY_MID = [
  "Are basic scale numbers present? (DAU, rough QPS — even back-of-envelope is fine)",
  "Is the ballpark reasonable? (methodology matters more than exact digits)",
];
const CAPACITY_SENIOR = [
  ...CAPACITY_MID,
  "Does the reasoning hold from users to infrastructure? (DAU → QPS → storage → bandwidth — the logic must be sound, but it need not be written out step-by-step)",
  "Does the architecture generally fit the calculated scale? (don't nitpick exact node counts)",
  "Are component choices justified by scale? (why Kafka vs SQS, why Redis vs Memcached for THIS load?)",
];
const CAPACITY_STAFF = [
  ...CAPACITY_SENIOR,
  "What does storage growth look like over time? (1 year, 3 years — is there a plan?)",
  "What's the cache strategy? (hit ratio assumptions, cold start story, thundering herd mitigation)",
  "Can the chosen DB actually handle the calculated QPS? (read vs write split considered)",
];
const CAPACITY_DEEP = [
  ...CAPACITY_STAFF,
  "Is there any cost awareness? (compute + storage + bandwidth — even rough estimates)",
  "What's the growth plan? (2-3x headroom, auto-scaling triggers, when to re-architect)",
  "Are auto-scaling thresholds derived from the calculations? (not arbitrary percentages)",
];

const API_MID = [
  "Do endpoints cover the core functional requirements? (can you actually use this system through these APIs?)",
  "Is the protocol choice clear? (REST, WebSocket, gRPC — and appropriate for the use case)",
  "Are the basic CRUD operations present for primary entities?",
];
const API_SENIOR = [
  ...API_MID,
  "Is the URL/resource design clean? (for REST: resource-oriented; for WebSocket: clear message types)",
  "What happens on large result sets? (pagination, cursor-based — skip if no list endpoints exist)",
  "Are HTTP verbs correct for REST? (skip for WebSocket — evaluate message type design instead)",
  "What does the client see on errors? (status codes, error shapes, retry guidance)",
];
const API_STAFF = [
  ...API_SENIOR,
  "What happens if POST /create is called twice? (idempotency — is the mutation safe to retry?)",
  "How do you version without breaking existing clients? (API versioning strategy)",
  "What stops a bad actor from hammering the API? (rate limiting, throttling)",
  "Can you add fields without breaking old clients? (backward compatibility)",
  "Is there a bulk/batch path for high-throughput operations?",
];
const API_DEEP = [
  ...API_STAFF,
  "Is every endpoint authenticated and authorized? (who can call what?)",
  "What about injection attacks? (SQL injection, XSS, command injection — input validation)",
  "Is there an API gateway? (routing, auth, rate limiting in one place)",
  "How do internal services authenticate to each other? (mTLS, service mesh, API keys)",
];

const HLD_MID = [
  "Does the design work end-to-end? (trace a request from client to response — does it complete?)",
  "Are components connected logically? (no floating boxes with no arrows)",
  "Do data flows address the functional requirements? (can the system actually DO what's asked?)",
  "Are there orphaned components? (drawn but never used in any flow)",
];
const HLD_SENIOR = [
  ...HLD_MID,
  "Where are the bottlenecks at the stated scale? (what's the first thing that breaks under load?)",
  "Is caching used where it matters? (hot read paths, expensive computations)",
  "Are heavy operations async? (don't block the user for things that can happen later)",
  "What's the single point of failure? (if one node dies, does the whole system go down?)",
];
const HLD_STAFF = [
  ...HLD_SENIOR,
  "How is data partitioned? (sharding strategy, partition key choice, cross-partition query impact)",
  "What consistency trade-offs were made? (strong vs eventual — and WHY for this use case)",
  "What happens when a downstream service is slow or down? (circuit breakers, timeouts, fallbacks)",
  "How does the system degrade gracefully? (what features drop first under pressure?)",
  "What breaks, what's the blast radius, and what's the recovery path? (failure scenarios)",
  "Is there a single point of failure, and how is it mitigated?",
  "Is the system observable? (monitoring, alerting, logging — can you debug a production issue?)",
];
const HLD_DEEP = [
  ...HLD_STAFF,
  "Is there a multi-region or disaster recovery story? (RTO/RPO targets)",
  "How do you deploy without downtime? (blue-green, canary, rolling — any strategy)",
  "Where would you inject failures to test resilience? (chaos engineering — blast radius boundaries)",
  "Is there cost awareness in component choices? (over-engineering vs right-sizing)",
  "Can you trace a request end-to-end in production? (distributed tracing, correlation IDs)",
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
  nfr: "non-functional requirements — are quality attributes identified, are targets defensible, and do they actually drive design decisions? Think: what breaks if these targets are wrong? Do NOT comment on HLD component choices or infrastructure.",
  entities: "core domain entities — are the right nouns identified, are relationships clear, and at Staff+ level, are access patterns and partitioning thought through? At Mid/Senior, focus ONLY on whether entities and relationships are present — do NOT demand attributes, indexes, or sharding. Do NOT comment on infrastructure or API design.",
  capacity: "capacity planning — is there a logical chain from users to infrastructure, and does the methodology make sense? Don't argue exact numbers — focus on whether the APPROACH is sound. Do NOT comment on component design or API routes.",
  api: "API/protocol design — can you actually use this system through these endpoints? What happens on errors, retries, and edge cases? Do NOT comment on backend architecture or data modeling.",
  hld: "architecture and design thinking — where are the bottlenecks, what breaks under failure, what trade-offs were made and why? Focus on gaps, risks, and failure scenarios — not template compliance. You will also receive other sections (NFR, Entities, Capacity, API) as cross-reference context. Use them to verify consistency — do NOT flag something as missing if it's addressed in another section.",
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
      "description": "<what could go wrong, framed as a scenario or probing question — e.g. 'What happens when the payment service is slow? Without a timeout, the booking flow blocks indefinitely.'>"
    }
  ]
}`;

/**
 * Sections that get the "lenient on format, strict on reasoning" treatment.
 * For these, the reviewer must NOT penalize presentation/format gaps, but must
 * still flag substantive coverage gaps — scaled to the current review level.
 */
const LENIENT_GUIDANCE: Partial<Record<ReviewerSection, string>> = {
  entities: `THIS SECTION — "LENIENT ON FORMAT, STRICT ON REASONING":
- Do NOT flag presentation/format: no formal schema or table, fields described in prose, no ER diagram, informal notation. Identifying the right nouns and relationships informally is FULL marks.
- Reward the right entities and clear relationships even if loosely written. Reasoning beats formatting.
- DO flag substantive coverage gaps that are EXPECTED AT THIS LEVEL (use "warning"): e.g. a relationship left undefined, or access patterns/partitioning not reasoned about (Staff+ only).
- Use "critical" ONLY when a core entity required for the happy path is missing entirely, or the section is essentially absent/nonsensical.`,
  capacity: `THIS SECTION — "LENIENT ON FORMAT, STRICT ON REASONING":
- Do NOT flag presentation/format: the full chain need not be written out step-by-step, intermediate arithmetic may be skipped, informal notation is fine. "~100TB/day × 30d ≈ 3PB" is FULL marks without showing every step.
- Reward a correct order-of-magnitude over perfect math. The reasoning must hold from users to infrastructure, but it need not be spelled out.
- DO flag substantive coverage gaps that are EXPECTED AT THIS LEVEL (use "warning"): a missing major dimension such as peak load, storage growth, or replication overhead — only those the level expects.
- Use "critical" ONLY when capacity is essentially absent, or a number is wrong by an order of magnitude.`,
  api: `THIS SECTION — "LENIENT ON FORMAT, STRICT ON REASONING":
- Do NOT flag presentation/format: full request/response schemas need not be written, not every field must be listed, minor REST verb/status-code imperfections and informal endpoint notation are fine.
- Reward endpoints that cover the core flow even if loosely specified. Reasoning beats formatting.
- DO flag substantive coverage gaps that are EXPECTED AT THIS LEVEL (use "warning"): e.g. error/retry handling, pagination on list endpoints, or idempotency/versioning (Staff+) — only those the level expects.
- Use "critical" ONLY when the core functional requirements cannot be used through the API at all, the protocol is wrong for the use case, or the section is essentially absent.`,
};

/**
 * Build a focused system prompt for a single section reviewer (multi-call mode).
 */
export function getReviewerPrompt(reviewer: ReviewerSection, level: ReviewLevel): string {
  const name = REVIEWER_NAMES[reviewer];
  const focus = REVIEWER_FOCUS[reviewer];
  const checklist = buildDimensionChecklist(level, reviewer);
  const label = LEVEL_LABELS[level];
  const lenientBlock = LENIENT_GUIDANCE[reviewer];

  return `You are the ${name} on a system design interview panel. You are reviewing at ${label}.

${GROUND_RULES}

YOUR SOLE RESPONSIBILITY: ${focus}

INTERVIEW MINDSET: Think like a senior interviewer, not a checklist auditor. For each criterion, ask yourself: "If I were sitting across from this candidate, what would I push back on? What failure scenario would I probe? What trade-off did they miss?" Frame issues as scenarios and probing questions, not as missing template items. Say "What happens when X fails?" not "Missing circuit breaker pattern."

SECTION OWNERSHIP:You are the ${name}. ONLY comment on your own section. Do not provide feedback on other dimensions.

YOUR CHECKLIST (${CRITERIA[level][reviewer].length} criteria — check each one):
${checklist}

CRITERIA ARE CUMULATIVE: Check ALL criteria from lower levels IN ADDITION to level-specific criteria. The checklist above already includes all accumulated criteria.
${lenientBlock ? `\n${lenientBlock}\n` : ""}
FEEDBACK — TWO SEPARATE ARRAYS:

"highlights" array — things done WELL (use "strong" or "good"):
- "strong": A design choice that shows real depth — the candidate clearly thought about failure modes, trade-offs, or edge cases. Use sparingly.
- "good": A solid, thoughtful decision worth acknowledging — not just "they drew a box."

"issues" array — gaps, risks, and missed trade-offs (use "critical", "warning", or "info"):
- "critical": This would cause the system to fail in production. Frame as: "What happens when X? The system would Y."
- "warning": An important gap the candidate should think about. Frame as: "Have you considered what happens if...?"
- "info": A suggestion that would strengthen the design. Frame as: "You could improve this by..."

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
3. 2-3 follow-up questions a real interviewer would ask — probe failure scenarios, trade-off justifications, and scaling limits (e.g. "What happens when your primary DB goes down?", "Why did you choose X over Y for this component?", "Walk me through what happens at 10x your stated scale.")

RULES:
- Return ONLY valid JSON. No markdown fences, no explanation text outside the JSON.
- Base your assessment on the reviewer findings provided. Do not invent issues not mentioned by the reviewers.
- The hire signal should reflect the AGGREGATE quality across all dimensions.
- DO NOT manufacture strengths. If the design is empty, gibberish, or low-effort, topStrengths MUST be an empty array []. A "no-hire" signal is appropriate for designs with no real content. Never praise the mere existence of components if they have no meaningful labels, connections, or rationale.
- If most reviewer summaries report critical issues with empty or nonsensical content, the signal MUST be "no-hire".

${LEAD_REVIEWER_RESPONSE_SCHEMA}`;
}
