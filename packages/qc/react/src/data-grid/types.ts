import type { ColumnFiltersState, PaginationState, SortingState } from '@ez-kit/data-grid-react'

/** The applied query axes, not the pending draft or the complete table state. */
export type GridQueryParams = {
	pagination: PaginationState
	sorting: SortingState
	columnFilters: ColumnFiltersState
	globalFilter: unknown
}

/** Collection identity excludes the per-page cursor and the table's page index. */
export type GridInfiniteParams = Omit<GridQueryParams, 'pagination'> & { pageSize: number }

export type GridCreateContext<TRow extends object> = { values: Partial<TRow> }
export type GridUpdateContext<TRow extends object> = GridCreateContext<TRow> & {
	rowId: string
	row: TRow | undefined
}
export type GridDeleteContext<TRow extends object> = { rowId: string; row: TRow }
export type GridDeleteManyContext<TRow extends object> = { rowIds: string[]; rows: TRow[] }

export type ReadTransport = { signal: AbortSignal }
export type GridFetcher<TArgs, TResponse> = (args: TArgs, transport: ReadTransport) => Promise<TResponse>
