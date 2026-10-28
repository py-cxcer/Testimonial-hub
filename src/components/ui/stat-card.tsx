import { Card } from "./card";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs font-medium">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
