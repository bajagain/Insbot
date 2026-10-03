import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileJsonStore } from "../src/storage/jsonStore.js";

interface Shape {
  items: Record<string, number>;
}

let dir: string;
const storeFor = (file = "data.json") =>
  new FileJsonStore<Shape>({
    filePath: path.join(dir, file),
    defaults: () => ({ items: {} }),
  });

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "insbit-json-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("FileJsonStore", () => {
  it("creates the file with defaults on first read", async () => {
    const store = storeFor();
    const data = await store.read();
    expect(data).toEqual({ items: {} });
    expect(await readFile(store.filePath, "utf8")).toContain('"items"');
  });

  it("writes and reads back data", async () => {
    const store = storeFor();
    await store.write({ items: { a: 1, b: 2 } });
    expect(await store.read()).toEqual({ items: { a: 1, b: 2 } });
  });

  it("updates atomically through the updater", async () => {
    const store = storeFor();
    await store.update((d) => ({ items: { ...d.items, a: 1 } }));
    await store.update((d) => ({ items: { ...d.items, b: 2 } }));
    expect(await store.read()).toEqual({ items: { a: 1, b: 2 } });
  });

  it("recovers from corrupted JSON by returning defaults", async () => {
    const store = storeFor();
    await writeFile(store.filePath, "{ this is not json", "utf8");
    expect(await store.read()).toEqual({ items: {} });
  });

  it("never leaves a .tmp file behind after a write", async () => {
    const store = storeFor();
    await store.write({ items: { x: 1 } });
    const entries = await readdir(dir);
    expect(entries.some((f) => f.endsWith(".tmp"))).toBe(false);
  });

  it("serializes concurrent writes without corruption", async () => {
    const store = storeFor();
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        store.update((d) => ({ items: { ...d.items, [`k${i}`]: i } })),
      ),
    );
    const data = await store.read();
    expect(Object.keys(data.items)).toHaveLength(50);
    // File is valid JSON (read() would have fallen back to defaults otherwise).
    expect(data.items.k49).toBe(49);
  });
});
