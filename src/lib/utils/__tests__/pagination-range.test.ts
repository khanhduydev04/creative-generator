import { describe, it, expect } from "vitest";
import { getPaginationRange } from "@/lib/utils/pagination-range";

describe("getPaginationRange", () => {
  it("returns every page when total pages fit without truncation", () => {
    expect(getPaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns a single page when there is only one page", () => {
    expect(getPaginationRange(1, 1)).toEqual([1]);
  });

  it("shows a trailing ellipsis when current page is near the start", () => {
    expect(getPaginationRange(2, 10)).toEqual([1, 2, 3, "ellipsis", 10]);
  });

  it("shows a leading ellipsis when current page is near the end", () => {
    expect(getPaginationRange(9, 10)).toEqual([1, "ellipsis", 8, 9, 10]);
  });

  it("shows both ellipses when current page is in the middle", () => {
    expect(getPaginationRange(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  it("never emits two ellipses back to back for pages just past the boundary", () => {
    // Page 4 of 10: gap between page 1 and sibling range [3,4,5] is only page 2 —
    // should render 2 explicitly instead of collapsing it into an ellipsis.
    expect(getPaginationRange(4, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]);
  });
});
