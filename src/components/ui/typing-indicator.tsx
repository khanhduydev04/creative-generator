import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  label?: string;
  className?: string;
}

export function TypingIndicator({ label = "Thinking", className }: TypingIndicatorProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-sm text-foreground-muted", className)}>
      {label && <span>{label}</span>}
      <span className="inline-flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-typing-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-typing-pulse [animation-delay:200ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-typing-pulse [animation-delay:400ms]" />
      </span>
    </div>
  );
}
