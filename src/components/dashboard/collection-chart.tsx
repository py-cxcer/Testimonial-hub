"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { DailyDataPoint, TimeRange } from "@/lib/analytics";
import { CalendarDays } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";

interface CollectionChartProps {
  data: DailyDataPoint[];
  currentRange: TimeRange;
}

export default function CollectionChart({ data, currentRange }: CollectionChartProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleRangeChange = (range: TimeRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.push(`${pathname}?${params.toString()}`);
  };

  const ranges: { label: string; value: TimeRange }[] = [
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" },
    { label: "90 days", value: "90d" },
    { label: "All time", value: "all" },
  ];

  const totalInPeriod = data.reduce((acc, curr) => acc + curr.count, 0);
  const axis = isDark ? "#71717a" : "#a1a1aa";

  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-fg">Submissions over time</h2>
            <Badge tone="accent">{totalInPeriod} in period</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted">Testimonials collected across all your spaces</p>
        </div>

        <div className="inline-flex rounded-lg bg-surface-2 p-1" role="group" aria-label="Date range">
          {ranges.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => handleRangeChange(r.value)}
              aria-pressed={currentRange === r.value}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                currentRange === r.value ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 || totalInPeriod === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-line-strong text-center">
          <CalendarDays className="mb-2 h-7 w-7 text-faint" aria-hidden="true" />
          <p className="text-sm font-medium text-fg">No testimonials in this period</p>
          <p className="mt-1 text-xs text-muted">New submissions will show up here automatically.</p>
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                stroke={axis}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickFormatter={(val) => {
                  const parts = val.split("-");
                  return `${parts[1]}/${parts[2]}`;
                }}
              />
              <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: isDark ? "rgb(255 255 255 / 0.05)" : "rgb(0 0 0 / 0.04)" }}
                contentStyle={{
                  backgroundColor: isDark ? "#131318" : "#ffffff",
                  border: isDark ? "1px solid #27272f" : "1px solid #e4e4e7",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  color: isDark ? "#f4f4f5" : "#18181b",
                  boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
                }}
                labelFormatter={(label) => `Date: ${label}`}
                formatter={(value) => [`${value ?? 0} testimonials`, "Collected"]}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
