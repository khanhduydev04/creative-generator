"use client";

// Client Component: setTimeout-driven typewriter requires browser environment
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface StreamingTextProps {
  text: string;
  speed?: number;
  className?: string;
  showCursor?: boolean;
  onComplete?: () => void;
}

export function StreamingText({
  text,
  speed = 24,
  className,
  showCursor = true,
  onComplete,
}: StreamingTextProps) {
  const [displayed, setDisplayed] = useState("");
  // Hold the latest onComplete in a ref so the animation effect doesn't
  // re-run when the parent passes an inline callback whose identity changes
  // every render. Without this, an inline onComplete would trigger an
  // infinite reset/animate cycle once typing reaches completion.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (displayed.length === text.length) {
      onCompleteRef.current?.();
      return;
    }
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [displayed, text, speed]);

  // Reset when text changes (e.g., new SSE step message)
  useEffect(() => {
    setDisplayed("");
  }, [text]);

  const isComplete = displayed.length === text.length;

  return (
    <span className={cn(className)}>
      {displayed}
      {showCursor && !isComplete && (
        <span
          aria-hidden="true"
          className="inline-block w-0.5 h-[1em] ml-0.5 bg-primary animate-typing-pulse align-text-bottom"
        />
      )}
    </span>
  );
}
