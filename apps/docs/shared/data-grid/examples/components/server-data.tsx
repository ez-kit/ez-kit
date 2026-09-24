'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFns,
	globalFilteringFeature,
	loadingFeature,
	rowPaginationFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useCallback, useEffect, useRef, useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, columns, type User } from './_data'

import type { ColumnFiltersState, SortingState } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	loadingFeature,
	columnFilteringFeature,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	sortFns,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

// ---------------------------------------------------------------------------
// Simulated server dataset + mock fetch
// ---------------------------------------------------------------------------

const ALL_USERS: User[] = makeUsers(120)

const PAGE_SIZE = 10
const NETWORK_DELAY_MS = 700

type ServerQuery = {
	pageIndex: number
	pageSize: number
	sorting: SortingState
	columnFilters: ColumnFiltersState
	globalFilter: string
}

type ServerPage = {
	rows: User[]
	rowCount: number
}

function applySort(rows: User[], sorting: SortingState): User[] {
	if (sorting.length === 0) return rows
	return [...rows].sort((a, b) => {
		for (const s of sorting) {
			const av = a[s.id as keyof User]
			const bv = b[s.id as keyof User]
			if (av < bv) return s.desc ? 1 : -1
			if (av > bv) return s.desc ? -1 : 1
		}
		return 0
	})
}

function applyFilters(rows: User[], columnFilters: ColumnFiltersState, globalFilter: string): User[] {
	let result = rows

	for (const f of columnFilters) {
		const val = String(f.value).toLowerCase()
		result = result.filter((row) =>
			String(row[f.id as keyof User])
				.toLowerCase()
				.includes(val),
		)
	}

	if (globalFilter.trim()) {
		const q = globalFilter.trim().toLowerCase()
		result = result.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(q)))
	}

	return result
}

function fetchPage(query: ServerQuery): Promise<ServerPage> {
	return new Promise((resolve) => {
		setTimeout(() => {
			const filtered = applyFilters(ALL_USERS, query.columnFilters, query.globalFilter)
			const sorted = applySort(filtered, query.sorting)
			const start = query.pageIndex * query.pageSize
			const rows = sorted.slice(start, start + query.pageSize)
			resolve({ rows, rowCount: filtered.length })
		}, NETWORK_DELAY_MS)
	})
}

// ---------------------------------------------------------------------------
// Example component
// ---------------------------------------------------------------------------

export function ServerDataExample() {
	const [rows, setRows] = useState<User[]>([])
	const [rowCount, setRowCount] = useState(0)
	const [pageIndex, setPageIndex] = useState(0)
	const [pageSize, setPageSize] = useState(PAGE_SIZE)
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = useState('')

	// Controlled loading state — fed directly into state.loading.
	const [isPending, setIsPending] = useState(true)
	const [isFetching, setIsFetching] = useState(false)
	const [isError, setIsError] = useState(false)
	const [error, setError] = useState<unknown>(null)

	// Keep a stable ref to the current query so the fetch fn always closes over
	// the latest values without needing them in the dependency array.
	const queryRef = useRef<ServerQuery>({ pageIndex, pageSize, sorting, columnFilters, globalFilter })
	queryRef.current = { pageIndex, pageSize, sorting, columnFilters, globalFilter }

	// Last-write-wins guard: increment a counter for each fetch; only the
	// response matching the latest counter is applied.
	const fetchCountRef = useRef(0)

	const fetch = useCallback(async () => {
		const id = ++fetchCountRef.current

		// On the very first load rows are empty → isPending drives the skeleton.
		// Subsequent fetches keep existing rows visible under the refetch overlay.
		if (rows.length === 0) {
			setIsPending(true)
		}
		setIsFetching(true)
		setIsError(false)
		setError(null)

		try {
			const page = await fetchPage(queryRef.current)

			// Drop stale responses (last-write-wins race protection).
			if (id !== fetchCountRef.current) return

			setRows(page.rows)
			setRowCount(page.rowCount)
			setIsPending(false)
			setIsFetching(false)
		} catch (err: unknown) {
			if (id !== fetchCountRef.current) return

			setIsPending(false)
			setIsFetching(false)
			setIsError(true)
			setError(err)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Load on mount and whenever any query param changes. This manual
	// fetch-in-effect is exactly what React Query removes — the `set-state-in-effect`
	// disable below is the smell that the recommended RQ pattern (see docs) avoids.
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void fetch()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageIndex, pageSize, sorting, columnFilters, globalFilter])

	return (
		<DataGrid
			features={features}
			data={rows}
			columns={columns}
			pagination={{
				manual: true,
				rowCount,
				onChange: ({ pageIndex: pi, pageSize: ps }) => {
					setPageIndex(pi)
					setPageSize(ps)
				},
			}}
			sorting={{
				manual: true,
				onChange: (next) => {
					setSorting(next)
					setPageIndex(0)
				},
			}}
			filtering={{
				manual: true,
				onChange: (next) => {
					setColumnFilters(next)
					setPageIndex(0)
				},
			}}
			// Global filtering is made server-side by `filtering.manual` above —
			// TanStack's manual filtering covers the global filter too, so there is
			// no separate `globalFiltering.manual` flag.
			globalFiltering={{
				onChange: (next) => {
					setGlobalFilter(String(next ?? ''))
					setPageIndex(0)
				},
			}}
			state={{
				pagination: { pageIndex, pageSize },
				sorting,
				columnFilters,
				globalFilter,
				loading: { isPending, isFetching, isError, error },
			}}
		/>
	)
}
