/**
 * Safely parse JSON from Gemini responses.
 * Handles: markdown fences, trailing commas, text before/after JSON,
 * truncated output, BOM characters, thinking blocks.
 */
// Hoisted regex patterns — avoid re-creating on every call
const RE_CODE_FENCE_START = /^```(?:json)?\s*\n?/i;
const RE_CODE_FENCE_END = /\n?\s*```\s*$/i;
const RE_TRAILING_COMMA = /,\s*([}\]])/g;

export function safeJsonParse<T>(raw: string): T {
  let text = raw.trim();

  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Strip markdown code fences
  text = text.replace(RE_CODE_FENCE_START, "").replace(RE_CODE_FENCE_END, "");

  // Extract JSON object or array — find the first { or [ and last matching } or ]
  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");

  let start: number;
  let endChar: string;

  if (objStart === -1 && arrStart === -1) {
    // No JSON structure found — try parsing as-is (might be a primitive)
    start = 0;
    endChar = "";
  } else if (arrStart === -1 || (objStart !== -1 && objStart < arrStart)) {
    start = objStart;
    endChar = "}";
  } else {
    start = arrStart;
    endChar = "]";
  }

  if (endChar) {
    const end = text.lastIndexOf(endChar);
    if (end > start) {
      text = text.substring(start, end + 1);
    }
  }

  // Remove trailing commas before } or ]
  text = text.replace(RE_TRAILING_COMMA, "$1");

  try {
    return JSON.parse(text) as T;
  } catch {
    // Attempt to repair truncated JSON by closing open structures
    const repaired = repairTruncatedJson(text);
    if (repaired !== text) {
      try {
        console.warn("[safeJsonParse] Repaired truncated JSON successfully");
        return JSON.parse(repaired) as T;
      } catch { /* fall through to error */ }
    }

    const preview = text.substring(0, 300);
    console.error(
      `[safeJsonParse] Failed to parse JSON. Preview: ${preview}`,
    );
    throw new Error(
      `Invalid JSON from Gemini: truncated or malformed response`,
    );
  }
}

/**
 * Attempt to repair truncated JSON by closing open strings, arrays, and objects.
 * Handles common Gemini truncation patterns where output is cut mid-response.
 */
function repairTruncatedJson(text: string): string {
  let repaired = text;

  // If text ends mid-string (unmatched quote), close the string
  // Count unescaped quotes
  let inString = false;
  let lastCharBeforeEnd = "";
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (ch === '"' && lastCharBeforeEnd !== "\\") {
      inString = !inString;
    }
    lastCharBeforeEnd = ch;
  }

  if (inString) {
    // Truncated inside a string value — close it
    repaired += '"';
  }

  // Remove any trailing comma after closing the string
  repaired = repaired.replace(/,\s*$/, "");

  // Close any open brackets/braces
  const stack: string[] = [];
  let inStr = false;
  let prev = "";
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (ch === '"' && prev !== "\\") {
      inStr = !inStr;
    } else if (!inStr) {
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}" || ch === "]") stack.pop();
    }
    prev = ch;
  }

  // Close open structures in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    repaired += open === "{" ? "}" : "]";
  }

  return repaired;
}
