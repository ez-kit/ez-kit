/**
 * Default page size for page-based pagination.
 *
 * Applied by {@link createTable} as the initial `pagination.pageSize` when the consumer
 * enables pagination without specifying a size. Lives in core so every layer above
 * (React adapter, UI kits, docs) can reference a single source instead of re-hardcoding `10`.
 */
export const DEFAULT_PAGE_SIZE = 10

/**
 * `pageCount` handed to TanStack when a manually paginated grid supplies neither
 * `rowCount` nor `pageCount` — i.e. the total is genuinely unknown.
 *
 * TanStack has no first-class "unknown" for `pageCount`: `getPageCount()` returns
 * `options.pageCount` whenever it is non-nullish, so the sentinel must be a number and it
 * surfaces verbatim. Layers above must normalize it (see the React `Pagination`) rather than
 * render it or do arithmetic on it — it read as the literal text "Page 1 of -1". Arithmetic is
 * the milder hazard: `setPageIndex(pageCount - 1)` passed -2, which core then clamped to 0.
 */
export const UNKNOWN_PAGE_COUNT = -1
