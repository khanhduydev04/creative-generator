// ─── Shared SSE stream parser ────────────────────────────────────────────────

export interface SSEEvent {
  event: string;
  data: string;
}

/**
 * Parse a buffer of SSE text into discrete events.
 * Returns parsed events and the remaining (incomplete) buffer.
 */
export function parseSSEChunk(buffer: string): {
  events: SSEEvent[];
  remaining: string;
} {
  const parts = buffer.split("\n\n");
  const remaining = parts.pop() ?? "";
  const events: SSEEvent[] = [];

  for (const part of parts) {
    if (!part.trim()) continue;
    const lines = part.split("\n");
    let eventType = "";
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("event: ")) eventType = line.slice(7);
      else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
      else if (line === "data:") dataLines.push("");
    }
    const data = dataLines.join("\n");
    if (eventType && data) {
      events.push({ event: eventType, data });
    }
  }

  return { events, remaining };
}
