import { useCallback, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  results: T[];
  savedAt: number;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Caches generation results in localStorage with a 1-hour TTL.
 * Restores results on mount if they haven't expired.
 *
 * @param cacheKey - unique localStorage key (e.g. "workspace-results", "stealth-results")
 * @param results - current results array
 * @param setResults - state setter for results
 */
export function useResultsCache<T>(
  cacheKey: string,
  results: T[],
  setResults: (results: T[]) => void,
) {
  const restoredRef = useRef(false);

  // Restore from cache on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;

      const entry = JSON.parse(raw) as CacheEntry<T>;
      const age = Date.now() - entry.savedAt;

      if (age > TTL_MS || !entry.results?.length) {
        localStorage.removeItem(cacheKey);
        return;
      }

      setResults(entry.results);
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }, [cacheKey, setResults]);

  // Persist results whenever they change (non-empty)
  useEffect(() => {
    // Skip the initial empty state before restore
    if (!restoredRef.current) return;

    if (results.length === 0) return;

    try {
      const entry: CacheEntry<T> = {
        results,
        savedAt: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }, [cacheKey, results]);

  // Clear cache explicitly (call when starting a new generation)
  const clearCache = useCallback(() => {
    localStorage.removeItem(cacheKey);
  }, [cacheKey]);

  return { clearCache };
}
