import { describe, it, expect } from "vitest";
import {
  getTimeRangeStartDate,
  buildDailyTimeline,
  countDistinctSubmitters,
} from "@/lib/analytics";

describe("Phase 5 — Analytics date range calculations", () => {
  const refDate = new Date("2026-10-26T12:00:00Z");

  it("calculates 7-day start date correctly", () => {
    const start = getTimeRangeStartDate("7d", refDate);
    expect(start).not.toBeNull();
    if (start) {
      expect(start.toISOString().split("T")[0]).toBe("2026-10-19");
    }
  });

  it("calculates 30-day start date correctly", () => {
    const start = getTimeRangeStartDate("30d", refDate);
    expect(start).not.toBeNull();
    if (start) {
      expect(start.toISOString().split("T")[0]).toBe("2026-09-26");
    }
  });

  it("returns null for all-time range", () => {
    expect(getTimeRangeStartDate("all", refDate)).toBeNull();
  });
});

describe("Phase 5 — Daily timeline bucket aggregation", () => {
  const refDate = new Date("2026-10-26T12:00:00Z");

  it("zero-fills days with no submissions for 7d range", () => {
    const timeline = buildDailyTimeline([], "7d", refDate);
    expect(timeline.length).toBe(7);
    expect(timeline.every((pt) => pt.count === 0)).toBe(true);
    expect(timeline[timeline.length - 1].date).toBe("2026-10-26");
    expect(timeline[0].date).toBe("2026-10-20");
  });

  it("populates submission counts into the correct date bucket", () => {
    const timestamps = [
      "2026-10-26T10:00:00Z",
      "2026-10-26T15:30:00Z",
      "2026-10-25T08:00:00Z",
    ];
    const timeline = buildDailyTimeline(timestamps, "7d", refDate);
    const today = timeline.find((pt) => pt.date === "2026-10-26");
    const yesterday = timeline.find((pt) => pt.date === "2026-10-25");

    expect(today?.count).toBe(2);
    expect(yesterday?.count).toBe(1);
  });
});

describe("Phase 5 — Distinct submitters count", () => {
  it("counts distinct normalized emails", () => {
    const emails = [
      "alice@example.com",
      "ALICE@example.com",
      "  alice@example.com  ",
      "bob@example.com",
      null,
      undefined,
      "",
    ];
    expect(countDistinctSubmitters(emails)).toBe(2);
  });

  it("returns 0 for empty list", () => {
    expect(countDistinctSubmitters([])).toBe(0);
  });
});
