import { describe, it, expect } from "vitest";
import { getWeekId, getPreviousWeekId, SIGNAL_SCORES } from "@/types/challenge";

describe("getWeekId", () => {
  it("returns correct ISO week for a known Monday", () => {
    // 2026-04-27 is a Monday in W18
    expect(getWeekId(new Date("2026-04-27"))).toBe("2026-W18");
  });

  it("returns correct ISO week for a Sunday (end of week)", () => {
    // 2026-05-03 is the Sunday of W18
    expect(getWeekId(new Date("2026-05-03"))).toBe("2026-W18");
  });

  it("handles year boundary — Jan 1 in week 53 of previous year", () => {
    // 2021-01-01 is a Friday — belongs to W53 of 2020
    expect(getWeekId(new Date("2021-01-01"))).toBe("2020-W53");
  });

  it("returns W01 for first ISO week of 2026", () => {
    // 2026-01-05 is a Monday in W02; 2025-12-29 is in W01 of 2026
    expect(getWeekId(new Date("2025-12-29"))).toBe("2026-W01");
  });
});

describe("getPreviousWeekId", () => {
  it("returns previous week within the same year", () => {
    expect(getPreviousWeekId("2026-W18")).toBe("2026-W17");
  });

  it("handles rollback from W01 to previous year", () => {
    // W01 of 2026 -> previous is W52 of 2025 (2025 only has 52 ISO weeks)
    const prev = getPreviousWeekId("2026-W01");
    expect(prev).toBe("2025-W52");
  });

  it("handles rollback from W01 in a year with 52 weeks", () => {
    // W01 of 2025 -> previous is W52 of 2024
    const prev = getPreviousWeekId("2025-W01");
    expect(prev).toBe("2024-W52");
  });

  it("is inverse of getWeekId + 7 days", () => {
    const weekId = "2026-W20";
    // Compute Monday of W20
    const [yearStr, weekStr] = weekId.split("-W");
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
    // Previous Monday
    const prevMonday = new Date(monday);
    prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
    expect(getPreviousWeekId(weekId)).toBe(getWeekId(prevMonday));
  });
});

describe("SIGNAL_SCORES", () => {
  it("has 5 entries", () => {
    expect(Object.keys(SIGNAL_SCORES)).toHaveLength(5);
  });

  it("strong-hire scores highest (5)", () => {
    expect(SIGNAL_SCORES["strong-hire"]).toBe(5);
  });

  it("no-hire scores lowest (1)", () => {
    expect(SIGNAL_SCORES["no-hire"]).toBe(1);
  });

  it("all scores are in descending order by hire strength", () => {
    const order = ["strong-hire", "hire", "lean-hire", "lean-no-hire", "no-hire"];
    const scores = order.map((s) => SIGNAL_SCORES[s]);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i - 1]);
    }
  });
});
