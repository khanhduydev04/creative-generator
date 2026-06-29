// Client Component: 1-5 star rating input with hover highlight state
"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface VoiceRatingStarsProps {
  value: number;
  onChange: (score: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

export function VoiceRatingStars({
  value,
  onChange,
  readonly = false,
  size = "md",
}: VoiceRatingStarsProps) {
  const [hovered, setHovered] = useState(0);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && onChange(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            disabled={readonly}
            className={`${readonly ? "cursor-default" : "cursor-pointer"} transition-colors`}
          >
            <Star
              className={`${iconSize} ${
                filled ? "fill-yellow-400 text-yellow-400" : "text-foreground-subtle"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
