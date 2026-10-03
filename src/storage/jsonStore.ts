import { mkdir, readFile, rename, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";

/**
 * Serializes writes per file so that concurrent Discord interactions
 * can never interleave partial JSON writes to the same file.
 *
 * Request A ─┐
 * Request B ─┼──► write queue ──► profiles.json
 * Request C ─┘
 */
export class JsonWriteQueue {
  private queues = new Map<string, Promise<unknown>>();

  async enqueue<T>(file: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(file) ?? Promise.resolve();
    // Chain regardless of whether the previous op resolved or rejected.
    const next = previous.then(operation, operation);
    // Keep the chain alive but never let a rejection leak as unhandled.
    this.queues.set(
      file,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }
}

const sharedQueue = new JsonWriteQueue();

export interface JsonStore<T> {
  readonly filePath: string;
  read(): Promise<T>;
  write(data: T): Promise<void>;
  update(updater: (data: T) => T | Promise<T>): Promise<T>;
}

export interface JsonStoreOptions<T> {
  filePath: string;
  /** Shape used when the file does not exist or is unreadable/corrupt. */
  defaults: () => T;
  /** Optional validation/coercion of parsed data. */
  parse?: (raw: unknown) => T;
  queue?: JsonWriteQueue;
}

export class FileJsonStore<T> implements JsonStore<T> {
  public readonly filePath: string;
  private readonly defaults: () => T;
  private readonly parseFn: (raw: unknown) => T;
  private readonly queue: JsonWriteQueue;

  constructor(options: JsonStoreOptions<T>) {
    this.filePath = options.filePath;
    this.defaults = options.defaults;
    this.parseFn = options.parse ?? ((raw) => raw as T);
    this.queue = options.queue ?? sharedQueue;
  }

  private async exists(): Promise<boolean> {
    try {
      await access(this.filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Atomic write that does NOT go through the queue. Callers that already
   * hold the file's queue slot (update) must use this to avoid deadlocking.
   */
  private async writeAtomic(data: T): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    const serialized = `${JSON.stringify(data, null, 2)}\n`;
    await writeFile(tmp, serialized, "utf8");
    await rename(tmp, this.filePath);
  }

  /** Read + parse, falling back to defaults on missing/corrupt files. */
  async read(): Promise<T> {
    if (!(await this.exists())) {
      const fresh = this.defaults();
      await this.queue.enqueue(this.filePath, () => this.writeAtomic(fresh));
      return fresh;
    }

    try {
      const raw = await readFile(this.filePath, "utf8");
      if (raw.trim() === "") return this.defaults();
      return this.parseFn(JSON.parse(raw));
    } catch (err) {
      logger.error({ err, file: this.filePath }, "Corrupted JSON file — using defaults");
      return this.defaults();
    }
  }

  /**
   * Atomic write: serialize to a temp file, then rename over the original.
   * Rename is atomic on the same filesystem, so a crash mid-write can never
   * leave a half-written JSON document.
   */
  async write(data: T): Promise<void> {
    await this.queue.enqueue(this.filePath, () => this.writeAtomic(data));
  }

  /** Read-modify-write, fully serialized against other writers. */
  async update(updater: (data: T) => T | Promise<T>): Promise<T> {
    return this.queue.enqueue(this.filePath, async () => {
      // Read the raw file directly: read() would enqueue again and deadlock.
      const current = await this.readUnsafe();
      const next = await updater(current);
      await this.writeAtomic(next);
      return next;
    });
  }

  /** Parse the file without touching the queue (safe only inside a queue slot). */
  private async readUnsafe(): Promise<T> {
    if (!(await this.exists())) return this.defaults();
    try {
      const raw = await readFile(this.filePath, "utf8");
      if (raw.trim() === "") return this.defaults();
      return this.parseFn(JSON.parse(raw));
    } catch (err) {
      logger.error({ err, file: this.filePath }, "Corrupted JSON file — using defaults");
      return this.defaults();
    }
  }
}

export { sharedQueue as jsonWriteQueue };
