import { createProvider } from "@/lib/ai/providers";
import type { DrillQuestion } from "@/types/drills";
import { getDayId } from "@/types/drills";
import { LESSONS } from "@/app/learn/_content/registry";

/**
 * Grounding pool: every lesson in the Design Patterns module (all 27 patterns,
 * grouped by category). The registry is pure metadata (no React), so importing it
 * server-side is safe. We rotate which patterns each day focuses on for variety.
 */
const PATTERN_LESSONS = LESSONS.filter((l) => l.module === "patterns").map(
  (l) => ({ title: l.title, summary: l.summary, group: l.group ?? "General" }),
);

/** How many patterns to spotlight in a single day's 5-question set. */
const PATTERNS_PER_DAY = 8;

/* ── Deterministic daily rotation ────────────────────────────── */

/** Small string hash → 32-bit seed (deterministic per dayId). */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — deterministic given a seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick the day's spotlight patterns deterministically from the full pool. */
function selectDailyPatterns(dayId: string): typeof PATTERN_LESSONS {
  if (PATTERN_LESSONS.length <= PATTERNS_PER_DAY) return PATTERN_LESSONS;
  const rng = mulberry32(hashSeed(dayId));
  const pool = [...PATTERN_LESSONS];
  // Fisher–Yates shuffle seeded by the day.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, PATTERNS_PER_DAY);
}

/* ── Prompt ──────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are an expert system-design interviewer writing a daily quiz.
Produce EXACTLY 5 multiple-choice questions about system-design patterns for an
intermediate audience. Each question must have EXACTLY 4 options, exactly one correct
answer, and a concise explanation of why the correct option is right.

Spread the 5 questions across the different patterns provided — do not ask multiple
questions about the same pattern. Focus on conceptual understanding and trade-offs
(when to use a pattern, what problem it solves, its failure modes), not trivia or
vendor-specific syntax.

Respond with STRICT JSON only — no markdown, no code fences, no commentary. Use this exact shape:
{
  "questions": [
    { "prompt": "...", "options": ["a", "b", "c", "d"], "correctIndex": 0, "explanation": "..." }
  ]
}
The "questions" array must contain exactly 5 objects. "correctIndex" is an integer 0-3.`;

function buildUserContent(dayId: string): string {
  const grounding = selectDailyPatterns(dayId)
    .map((g) => `- [${g.group}] ${g.title}: ${g.summary}`)
    .join("\n");
  return `Today's spotlight patterns (write one question for 5 different patterns from this list):\n${grounding}\n\nWrite 5 questions that test understanding of these patterns' trade-offs and when each applies. Avoid trivia and avoid questions answerable without understanding the concepts.`;
}

/* ── Validation ──────────────────────────────────────────────── */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validateQuestions(parsed: unknown): DrillQuestion[] | null {
  const questions = (parsed as { questions?: unknown })?.questions;
  if (!Array.isArray(questions) || questions.length !== 5) return null;

  const result: DrillQuestion[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as {
      prompt?: unknown;
      options?: unknown;
      correctIndex?: unknown;
      explanation?: unknown;
    };
    if (!isNonEmptyString(q.prompt)) return null;
    if (!Array.isArray(q.options) || q.options.length !== 4) return null;
    if (!q.options.every(isNonEmptyString)) return null;
    if (
      typeof q.correctIndex !== "number" ||
      !Number.isInteger(q.correctIndex) ||
      q.correctIndex < 0 ||
      q.correctIndex > 3
    ) {
      return null;
    }
    if (!isNonEmptyString(q.explanation)) return null;

    result.push({
      id: `q${i + 1}`,
      prompt: q.prompt.trim(),
      options: (q.options as string[]).map((o) => o.trim()),
      correctIndex: q.correctIndex,
      explanation: q.explanation.trim(),
    });
  }
  return result;
}

/* ── Curated fallback bank ───────────────────────────────────── */

/**
 * Vetted pattern questions spanning multiple categories, used when AI generation
 * fails. Always valid so a drill is never broken.
 */
const FALLBACK_QUESTIONS: DrillQuestion[] = [
  {
    id: "q1",
    prompt:
      "A web app lets users upload large video files. What is the main benefit of issuing presigned URLs so clients upload directly to object storage?",
    options: [
      "It offloads upload bandwidth and CPU from the application servers to the object store",
      "It encrypts the file contents end-to-end automatically",
      "It guarantees the upload completes faster than any other method",
      "It removes the need to store any metadata about the file",
    ],
    correctIndex: 0,
    explanation:
      "Presigned URLs let clients talk directly to the object store, so the large file bytes never pass through your app servers — saving their bandwidth and CPU.",
  },
  {
    id: "q2",
    prompt:
      "Why do payment APIs require an idempotency key on requests that create a charge?",
    options: [
      "To compress the request body and save bandwidth",
      "So a retried or duplicated request creates the charge only once",
      "To authenticate the client without a session token",
      "To shard the payments table across multiple databases",
    ],
    correctIndex: 1,
    explanation:
      "An idempotency key lets the server recognize a retry of the same logical request and return the original result instead of creating a second charge — making retries safe.",
  },
  {
    id: "q3",
    prompt:
      "What problem does consistent hashing solve compared to plain modulo (hash(key) % N) partitioning?",
    options: [
      "It makes every key hash to the same node for locality",
      "It removes the need for any replication",
      "Adding or removing a node only remaps a small fraction of keys instead of nearly all of them",
      "It guarantees perfectly even load with no virtual nodes",
    ],
    correctIndex: 2,
    explanation:
      "With modulo partitioning, changing N reshuffles almost every key. Consistent hashing places nodes on a ring so only the keys near the changed node move, minimizing reshuffling.",
  },
  {
    id: "q4",
    prompt:
      "In the Saga pattern, how is a multi-service workflow rolled back when one step fails?",
    options: [
      "A single distributed ACID transaction is aborted across all services",
      "Each completed step runs a compensating action to undo its effect",
      "The whole system is restored from the last database backup",
      "The failed step is simply ignored and the workflow continues",
    ],
    correctIndex: 1,
    explanation:
      "Sagas avoid a global transaction by having each step define a compensating action; on failure, previously completed steps are undone via their compensations.",
  },
  {
    id: "q5",
    prompt: "Why is a circuit breaker placed in front of a remote dependency?",
    options: [
      "To cache every successful response indefinitely",
      "To encrypt traffic between the two services",
      "To fail fast when the dependency is unhealthy, preventing cascading slowdowns",
      "To load-balance requests across multiple replicas",
    ],
    correctIndex: 2,
    explanation:
      "When a dependency starts failing or timing out, the breaker trips and requests fail fast (or fall back) instead of piling up — stopping one sick service from dragging down callers.",
  },
];

/* ── Public API ──────────────────────────────────────────────── */

async function tryGenerate(dayId: string): Promise<DrillQuestion[] | null> {
  const provider = createProvider({ provider: "drawlint" });
  const result = await provider.generate({
    systemPrompt: SYSTEM_PROMPT,
    userContent: buildUserContent(dayId),
    temperature: 0.7,
    maxTokens: 2000,
  });
  return validateQuestions(result.parsed);
}

/**
 * Generate the day's 5 design-pattern drill questions via the managed DrawLint LLM,
 * grounded in (and rotated daily across) all 27 patterns in the Design Patterns module.
 * Retries once on failure, then falls back to a curated bank. Never throws — always
 * returns 5 valid questions so a drill is never broken.
 */
export async function generateDailyDrillQuestions(
  category: string,
  dayId: string = getDayId(),
): Promise<DrillQuestion[]> {
  void category; // Single "patterns" category today; kept for forward compatibility.

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const questions = await tryGenerate(dayId);
      if (questions) return questions;
    } catch {
      // Swallow and retry / fall back.
    }
  }

  return FALLBACK_QUESTIONS;
}
