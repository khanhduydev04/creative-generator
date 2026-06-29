import { describe, it, expect } from "vitest";
import { parseCsvToRows } from "../sheets-reader";

describe("parseCsvToRows", () => {
  const header =
    "Rank,Product Name,Image Link,Landing Page Link,Page Name,Duration (days),Steal-Worthy Score,Caption";

  it("parses simple CSV rows", () => {
    const csv = `${header}
1,Product A,,,Brand Page A,30,85,Great product caption`;

    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      rank: 1,
      productName: "Product A",
      imageUrl: null,
      landingPageUrl: null,
      pageName: "Brand Page A",
      durationDays: 30,
      wowScore: "85",
      caption: "Great product caption",
    });
  });

  it("parses multiple rows", () => {
    const csv = `${header}
1,Product A,,,Page A,10,90,Caption A
2,Product B,,,Page B,20,80,Caption B
3,Product C,,,Page C,30,70,Caption C`;

    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0].productName).toBe("Product A");
    expect(rows[2].productName).toBe("Product C");
  });

  it("handles quoted fields with commas", () => {
    const csv = `${header}
1,"Product, With Comma",,,Page A,10,90,"Caption with, commas inside"`;

    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].productName).toBe("Product, With Comma");
    expect(rows[0].caption).toBe("Caption with, commas inside");
  });

  it("handles escaped quotes (doubled quotes)", () => {
    const csv = `${header}
1,"Product ""Special""",,,Page A,10,90,"He said ""hello"""`;

    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].productName).toBe('Product "Special"');
    expect(rows[0].caption).toBe('He said "hello"');
  });

  it("handles quoted fields with newlines", () => {
    const csv = `${header}
1,Product A,,,Page A,10,90,"Line 1
Line 2
Line 3"`;

    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].caption).toContain("Line 1\nLine 2\nLine 3");
  });

  it("skips rows with too few columns", () => {
    const csv = `${header}
1,Product A
2,Product B,,,Page B,20,80,Valid caption`;

    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].productName).toBe("Product B");
  });

  it("skips rows with empty product name", () => {
    const csv = `${header}
1,,,,Page A,10,90,Caption`;

    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(0);
  });

  it("skips rows with non-numeric rank", () => {
    const csv = `${header}
abc,Product A,,,Page A,10,90,Caption`;

    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(0);
  });

  it("returns empty array for header-only CSV", () => {
    const rows = parseCsvToRows(header);
    expect(rows).toHaveLength(0);
  });

  it("returns empty array for empty string", () => {
    const rows = parseCsvToRows("");
    expect(rows).toHaveLength(0);
  });

  it("handles CRLF line endings", () => {
    const csv = `${header}\r\n1,Product A,,,Page A,10,90,Caption A\r\n2,Product B,,,Page B,20,80,Caption B`;

    const rows = parseCsvToRows(csv);
    expect(rows).toHaveLength(2);
  });
});
