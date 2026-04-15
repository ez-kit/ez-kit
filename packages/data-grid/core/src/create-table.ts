import {
	createTable as createTanStackTable,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getGroupedRowModel,
	getPaginationRowModel,
	getSortedRowModel,
} from '@tanstack/table-core'

import { mapColumns } from './column/map-columns'
import { CreatingFeature } from './features/creating'
import { DeletingFeature } from './features/deleting'
import { EditingFeature } from './features/editing'
import { LoadingFeature } from './features/loading'
import { buildColumnList, extractPinningState } from './system-columns'

import type { DataTable, TableConfig } from './types'
import type { RowSelectionState, TableOptionsResolved, TableState, Updater } from '@tanstack/table-core'

type AnyRow = Record<string, unknown>

/**
 * Creates a headless data-grid table instance wrapping TanStack Table v8.
 *
 * The returned object extends TanStack's Table with:
 * - subscribe / getSnapshot — for useSyncExternalStore
 * - setData — reactive data replacement
 * - Creating / Editing / Deleting / Loading feature methods
 *
 * @example
 * const table = createTable({ data: users, columns, sorting: true })
 */
export function createTable<TRow extends object>(config: TableConfig<TRow>): DataTable<TRow> {
	const listeners = new Set<() => void>()
	const notify = (): void => {
		listeners.forEach((l) => {
			l()
		})
	}

	// ── row identity ─────────────────────────────────────────────────────────
	const getRowId =
		config.getRowId ??
		((row: TRow, index: number): string => {
			const id = (row as Record<string, unknown>).id
			return id != null ? String(id) : String(index)
		})

	// ── map user columns → TanStack columns ──────────────────────────────────
	const mappedUserColumns = mapColumns(config.columns)

	const hasEditing = Boolean(config.editing)
	const hasDeleting = Boolean(config.deleting)
	const hasSelection = Boolean(config.selection)
	const hasExpanding = Boolean(config.expanding)

	const allColumns = buildColumnList(mappedUserColumns, {
		selection: hasSelection,
		expanding: hasExpanding,
		editing: hasEditing,
		deleting: hasDeleting,
	})

	const { left: pinnedLeft, right: pinnedRight } = extractPinningState(allColumns)

	// ── build TanStack options ────────────────────────────────────────────────
	const defaultPageSize =
		typeof config.pagination === 'object' && config.pagination.pageSize ? config.pagination.pageSize : 10

	const initialState: Partial<TableState> = {
		columnPinning: { left: pinnedLeft, right: pinnedRight },
		pagination: { pageIndex: 0, pageSize: defaultPageSize },
	}

	// We need a stable reference for the callback closure.
	// Using a wrapper object allows const + mutation inside the closure.
	const ref: { table: ReturnType<typeof createTanStackTable<TRow>> | null } = {
		table: null,
	}
	let currentState: TableState

	const onStateChange = (updater: Updater<TableState>): void => {
		currentState = typeof updater === 'function' ? updater(currentState) : updater
		ref.table?.setOptions((prev) => ({ ...prev, state: currentState }))
		notify()
	}

	// Build options without an explicit type annotation to avoid exactOptionalPropertyTypes
	// conflicts — let TypeScript infer, then cast at the call site.
	const onRowSelectionChange =
		typeof config.selection === 'object' && config.selection.onChange
			? (updater: Updater<RowSelectionState>): void => {
					const next = typeof updater === 'function' ? updater(currentState.rowSelection) : updater
					const selectedIds = Object.keys(next).filter((k) => next[k])
					;(config.selection as { onChange: (ids: string[]) => void }).onChange(selectedIds)
				}
			: undefined

	const options = {
		_features: [CreatingFeature, EditingFeature, DeletingFeature, LoadingFeature],
		data: config.data,
		columns: allColumns,
		getRowId,
		state: initialState as TableState, // will be replaced below
		onStateChange,
		getCoreRowModel: getCoreRowModel(),
		initialState,
		...(config.sorting ? { getSortedRowModel: getSortedRowModel() } : {}),
		...(config.filtering ? { getFilteredRowModel: getFilteredRowModel() } : {}),
		...(config.pagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
		...(config.expanding
			? { getExpandedRowModel: getExpandedRowModel(), getGroupedRowModel: getGroupedRowModel() }
			: {}),
		// Row selection
		enableRowSelection: hasSelection,
		...(onRowSelectionChange ? { onRowSelectionChange } : {}),
		// Pagination manual
		...(typeof config.pagination === 'object' && config.pagination.manual
			? { manualPagination: true, pageCount: config.pagination.pageCount ?? -1 }
			: {}),
		// Filtering manual
		...(typeof config.filtering === 'object' && config.filtering.manual ? { manualFiltering: true } : {}),
		// Sorting manual
		...(typeof config.sorting === 'object' && config.sorting.manual ? { manualSorting: true } : {}),
		// Feature configs
		...(config.creating ? { creating: config.creating } : {}),
		...(config.editing ? { editing: config.editing } : {}),
		...(config.deleting ? { deleting: config.deleting } : {}),
		// Column resizing
		...(config.sizing
			? {
					enableColumnResizing: true,
					columnResizeMode:
						typeof config.sizing === 'object' && config.sizing.mode ? config.sizing.mode : 'onChange',
					columnResizeDirection:
						typeof config.sizing === 'object' && config.sizing.direction ? config.sizing.direction : 'ltr',
				}
			: {}),
	}

	// Create the table. Features run getInitialState during this call.
	ref.table = createTanStackTable(options as unknown as TableOptionsResolved<TRow>)

	// Capture the fully-merged initial state (includes feature states)
	currentState = ref.table.initialState

	// Switch to fully-controlled mode with the real initial state
	ref.table.setOptions((prev) => ({ ...prev, state: currentState }))

	// Set initial loading state if provided
	if (config.loading === true) {
		ref.table.setLoading(true)
	}

	// ── compose the DataTable ─────────────────────────────────────────────────
	const dataTable = ref.table as DataTable<TRow>

	dataTable.subscribe = (listener) => {
		listeners.add(listener)
		return () => {
			listeners.delete(listener)
		}
	}

	dataTable.getSnapshot = () => currentState

	dataTable.setData = (data) => {
		ref.table?.setOptions((prev) => ({
			...prev,
			data: data as AnyRow[] as TRow[],
		}))
		notify()
	}

	// Override setLoading to also call notify (it goes through setState → onStateChange)
	// Feature's setLoading already calls table.setState which triggers onStateChange → notify ✓

	return dataTable
}
