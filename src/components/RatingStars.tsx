import { Star } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

type RatingStarsProps = {
  value: number;
  onChange?: (v: number) => void;
  max?: number;
  readOnly?: boolean;
  className?: string;
};

export const RatingStars: React.FC<RatingStarsProps> = ({
  value,
  onChange,
  max = 5,
  readOnly = false,
  className,
}) => {
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className={cn("flex items-center gap-2", className)} aria-label={`Rating ${value} of ${max}`}>
      {stars.map((i) => {
        const filled = i <= value;
        return (
          <button
            key={i}
            type="button"
            className={cn(
              "transition-transform",
              !readOnly && "hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            )}
            onClick={() => !readOnly && onChange?.(i)}
            aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
            disabled={readOnly}
          >
            <Star
              className={cn(
                "h-6 w-6",
                filled ? "text-primary" : "text-muted-foreground"
              )}
              fill={filled ? "currentColor" : "none"}
            />
          </button>
        );
      })}
    </div>
  );
};
