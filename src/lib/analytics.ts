export type TimeRange = "7d" | "30d" | "90d" | "all";

export interface DailyDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export function getTimeRangeStartDate(range: TimeRange, referenceDate = new Date()): Date | null {
  if (range === "all") return null;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = new Date(referenceDate);
  start.setUTCDate(start.getUTCDate() - days);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export function buildDailyTimeline(
  timestamps: string[],
  range: TimeRange,
  referenceDate = new Date()
): DailyDataPoint[] {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30; // default 30 days for 'all' timeline view

  // Build zero-filled map for every day in range
  const timelineMap = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setUTCDate(d.getUTCDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    timelineMap.set(dateKey, 0);
  }

  // Populate actual counts from timestamps
  timestamps.forEach((ts) => {
    const dateKey = new Date(ts).toISOString().split("T")[0];
    if (timelineMap.has(dateKey)) {
      timelineMap.set(dateKey, (timelineMap.get(dateKey) || 0) + 1);
    }
  });

  return Array.from(timelineMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}

export function countDistinctSubmitters(emails: (string | null | undefined)[]): number {
  const uniqueSet = new Set<string>();
  emails.forEach((email) => {
    if (email) {
      uniqueSet.add(email.trim().toLowerCase());
    }
  });
  return uniqueSet.size;
}
