export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface Page<T> extends PaginationState {
  items: T[];
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Clamp a 1-based page number into the valid range for `totalItems`.
 * Always returns at least 1, even for empty collections.
 */
export function clampPage(page: number, totalItems: number, pageSize: number): number {
  const totalPages = totalPagesFor(totalItems, pageSize);
  const normalized = Number.isFinite(page) ? Math.trunc(page) : 1;
  if (normalized < 1) return 1;
  if (normalized > totalPages) return totalPages;
  return normalized;
}

export function totalPagesFor(totalItems: number, pageSize: number): number {
  const size = Math.max(1, Math.trunc(pageSize));
  return Math.max(1, Math.ceil(totalItems / size));
}

/** Slice `items` into a page descriptor with navigation flags. */
export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const size = Math.max(1, Math.trunc(pageSize));
  const totalPages = totalPagesFor(items.length, size);
  const current = clampPage(page, items.length, size);
  const start = (current - 1) * size;

  return {
    items: items.slice(start, start + size),
    page: current,
    pageSize: size,
    totalItems: items.length,
    totalPages,
    hasPrevious: current > 1,
    hasNext: current < totalPages,
  };
}
