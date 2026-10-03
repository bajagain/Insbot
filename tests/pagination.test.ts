import { describe, expect, it } from "vitest";
import { clampPage, paginate, totalPagesFor } from "../src/utils/pagination.js";

const items = Array.from({ length: 25 }, (_, i) => i + 1);

describe("pagination", () => {
  it("computes total pages", () => {
    expect(totalPagesFor(25, 10)).toBe(3);
    expect(totalPagesFor(0, 10)).toBe(1);
  });

  it("returns the first page with previous disabled", () => {
    const page = paginate(items, 1, 10);
    expect(page.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(page.hasPrevious).toBe(false);
    expect(page.hasNext).toBe(true);
  });

  it("returns a middle page with both directions enabled", () => {
    const page = paginate(items, 2, 10);
    expect(page.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(page.hasPrevious).toBe(true);
    expect(page.hasNext).toBe(true);
  });

  it("returns the last page with next disabled", () => {
    const page = paginate(items, 3, 10);
    expect(page.items).toEqual([21, 22, 23, 24, 25]);
    expect(page.hasPrevious).toBe(true);
    expect(page.hasNext).toBe(false);
  });

  it("clamps out-of-range pages", () => {
    expect(clampPage(0, 25, 10)).toBe(1);
    expect(clampPage(99, 25, 10)).toBe(3);
    expect(clampPage(2, 25, 10)).toBe(2);
  });
});
