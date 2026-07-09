/**
 * Default page size for page-based pagination.
 *
 * Applied by {@link createTable} as the initial `pagination.pageSize` when the consumer
 * enables pagination without specifying a size. Lives in core so every layer above
 * (React adapter, UI kits, docs) can reference a single source instead of re-hardcoding `10`.
 */
export const DEFAULT_PAGE_SIZE = 10
