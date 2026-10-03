import { describe, expect, it } from "vitest";
import { RateLimiter } from "../src/security/rateLimiter.js";

describe("RateLimiter", () => {
  it("allows requests under the limit", () => {
    const rl = new RateLimiter(3, 60);
    expect(rl.check("u").allowed).toBe(true);
    expect(rl.check("u").allowed).toBe(true);
    // Third call fills the window: no remaining allowance.
    expect(rl.check("u").remaining).toBe(0);
  });

  it("blocks requests over the limit and reports retryAfter", () => {
    const rl = new RateLimiter(2, 60);
    rl.check("u");
    rl.check("u");
    const third = rl.check("u");
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks users independently", () => {
    const rl = new RateLimiter(1, 60);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });

  it("expires old timestamps out of the window", () => {
    const rl = new RateLimiter(1, 60);
    const t0 = 1_000_000;
    expect(rl.check("u", t0).allowed).toBe(true);
    expect(rl.check("u", t0 + 1000).allowed).toBe(false);
    // Past the window → allowed again.
    expect(rl.check("u", t0 + 61_000).allowed).toBe(true);
  });
});
