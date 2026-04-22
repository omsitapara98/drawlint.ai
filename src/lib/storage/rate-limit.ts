const USAGE_KEY = "drawlint:usage";
const BYO_KEY = "drawlint:byo-key";
const FREE_LIMIT = 5;

interface UsageData {
  month: string;
  count: number;
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getUsage(): UsageData {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { month: getCurrentMonth(), count: 0 };
    return JSON.parse(raw) as UsageData;
  } catch {
    return { month: getCurrentMonth(), count: 0 };
  }
}

function saveUsage(usage: UsageData): void {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch {
    // Storage full or unavailable
  }
}

export function isUsingBYOKey(): boolean {
  try {
    const raw = localStorage.getItem(BYO_KEY);
    if (!raw) return false;
    const config = JSON.parse(raw) as { apiKey?: string };
    return !!config.apiKey;
  } catch {
    return false;
  }
}

export function canAnalyze(): boolean {
  if (isUsingBYOKey()) return true;
  const usage = getUsage();
  if (usage.month !== getCurrentMonth()) return true;
  return usage.count < FREE_LIMIT;
}

export function recordAnalysis(): void {
  if (isUsingBYOKey()) return;
  const current = getCurrentMonth();
  const usage = getUsage();
  if (usage.month !== current) {
    saveUsage({ month: current, count: 1 });
  } else {
    saveUsage({ month: current, count: usage.count + 1 });
  }
}

export function getRemainingAnalyses(): number {
  if (isUsingBYOKey()) return Infinity;
  const usage = getUsage();
  if (usage.month !== getCurrentMonth()) return FREE_LIMIT;
  return Math.max(0, FREE_LIMIT - usage.count);
}
