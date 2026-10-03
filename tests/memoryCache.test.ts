import { describe, expect, it } from "vitest";
import { MemoryCache } from "../src/cache/memoryCache.js";

describe("MemoryCache", () => {
  it("misses on unknown keys", () => {
    const cache = new MemoryCache();
    expect(cache.get("nope")).toBeUndefined();
  });

  it("returns cached values on hit", () => {
    const cache = new MemoryCache();
    cache.set("k", { hello: "world" }, 60);
    expect(cache.get<{ hello: string }>("k")).toEqual({ hello: "world" });
    expect(cache.has("k")).toBe(true);
  });

  it("expires entries after their TTL", () => {
    const cache = new MemoryCache();
    cache.set("k", 1, 0);
    expect(cache.get("k")).toBeUndefined();
  });

  it("invalidates by prefix", () => {
    const cache = new MemoryCache();
    cache.set("profile:a", 1, 60);
    cache.set("profile:b", 2, 60);
    cache.set("posts:a", 3, 60);
    cache.invalidatePrefix("profile:");
    expect(cache.get("profile:a")).toBeUndefined();
    expect(cache.get("posts:a")).toBe(3);
  });

  it("prunes expired entries", () => {
    const cache = new MemoryCache();
    cache.set("a", 1, 60);
    cache.set("b", 2, 0);
    expect(cache.prune()).toBe(1);
    expect(cache.size).toBe(1);
  });
});
