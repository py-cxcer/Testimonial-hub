import { Star } from "lucide-react";
import { cn } from "./cn";

export function StarRating({
  value,
  size = 14,
  className,
}: {
  value: number | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!value) return null;
  return (
    <span
      role="img"
      aria-label={`${value} out of 5 stars`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          style={{ width: size, height: size }}
          className={n <= value ? "fill-star text-star" : "text-line-strong"}
        />
      ))}
    </span>
  );
}
