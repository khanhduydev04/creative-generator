export const PAGINATION_ELLIPSIS = "ellipsis";

const SIBLING_COUNT = 1;
const NO_TRUNCATION_THRESHOLD = 7;

export type PaginationItem = number | typeof PAGINATION_ELLIPSIS;

/** Compacts a page range around `current`, collapsing gaps into a single "ellipsis" marker. */
export function getPaginationRange(current: number, totalPages: number): PaginationItem[] {
  if (totalPages <= NO_TRUNCATION_THRESHOLD) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  for (let page = current - SIBLING_COUNT; page <= current + SIBLING_COUNT; page++) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);

  const items: PaginationItem[] = [];
  sorted.forEach((page, i) => {
    const previous = sorted[i - 1];
    if (previous !== undefined) {
      const gap = page - previous;
      // A gap of exactly one hidden page is just as wide as showing it, so show it.
      if (gap === 2) items.push(previous + 1);
      else if (gap > 2) items.push(PAGINATION_ELLIPSIS);
    }
    items.push(page);
  });

  return items;
}
