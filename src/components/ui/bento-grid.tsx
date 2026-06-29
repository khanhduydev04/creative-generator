import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        "auto-rows-[minmax(180px,auto)] gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  span?: "default" | "wide" | "tall" | "large";
  onClick?: () => void;
}

export function BentoCard({ children, className, span = "default", onClick }: BentoCardProps) {
  const spanClass =
    span === "wide" ? "sm:col-span-2"
    : span === "tall" ? "row-span-2"
    : span === "large" ? "sm:col-span-2 row-span-2"
    : "";
  const Component = onClick ? "button" : "div";
  return (
    <Component
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl text-left",
        "bg-background-subtle border border-border-subtle",
        "transition-all duration-300",
        "hover:border-border hover:shadow-lg hover:shadow-primary/5",
        onClick && "cursor-pointer",
        spanClass,
        className,
      )}
    >
      {children}
    </Component>
  );
}
