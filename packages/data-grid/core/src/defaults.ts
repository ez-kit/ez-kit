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
 * `options.pageCount` whenever it is non-nullish, so the sentinel must be a number and
 * it surfaces verbatim. Layers above must normalize it (see the React `Pagination`)
 * rather than render or arithmetic on it — `pageCount - 1` was reaching `setPageIndex(-2)`.
 */
export const UNKNOWN_PAGE_COUNT = -1
