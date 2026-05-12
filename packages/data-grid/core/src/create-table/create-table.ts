import {
	createTable as createTanStackTable,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
} from '@tanstack/table-core'

import { mapColumns } from '../column/map-columns'
import { CreatingFeature } from '../features/creating'
import { DeletingFeature } from '../features/deleting'
import { EditingFeature } from '../features/editing'
import { LoadingFeature } from '../features/loading'
import { buildOperatorRegistry } from '../features/operators'
import { createStore } from '../store'
import { buildColumnList, extractPinningState } from '../system-columns'

import type { ColumnDef } from '../column/types'
import type { DataTable, PinningConfig, RowPinningConfig, TableConfig } from '../types'
import type { RowSelectionState, TableOptionsResolved, TableState, Updater } from '@tanstack/table-core'

function collectDefaultHidden<TRow extends object>(defs: ColumnDef<TRow>[]): Record<string, boolean> {
	const acc: Record<string, boolean> = {}
	for (const def of defs) {
		if (def.visibility && typeof def.visibility === 'object' && def.visibility.defaultHidden) {
			const colId = def.id ?? def.accessorKey
			if (colId !== undefined) acc[colId] = false
		}
		if (def.columns !== undefined) {
			Object.assign(acc, collectDefaultHidden(def.columns))
		}
	}
	return acc
}

function normalizePinning(pinning: boolean | PinningConfig | undefined): {
	column: boolean
	row: RowPinningConfig | false
} {
	if (!pinning) return { column: false, row: false }
	if (pinning === true) return { column: true, row: { top: true, bottom: true } }
	const rowCfg = pinning.row
	const row: RowPinningConfig | false = rowCfg === true ? { top: true, bottom: true } : (rowCfg ?? false)
	return { column: Boolean(pinning.column), row }
}

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
	let store = createStore<TableState>({} as TableState)

	// ── row identity ─────────────────────────────────────────────────────────
	const getRowId =
		config.getRowId ??
		((row: TRow, index: number): string => {
			const id = (row as Record<string, unknown>).id
			return id != null ? String(id) : String(index)
		})

	// ── operator registry ────────────────────────────────────────────────────
	const tableFilteringOperators = typeof config.filtering === 'object' ? config.filtering.operators : undefined
	const operatorRegistry = buildOperatorRegistry(tableFilteringOperators)

	// ── map user columns → TanStack columns ──────────────────────────────────
	const mappedUserColumns = mapColumns(config.columns, operatorRegistry)

	const hasEditing = Boolean(config.editing)
	const hasDeleting = Boolean(config.deleting)
	const hasSelection = Boolean(config.selection)
	const hasExpanding = Boolean(config.expanding)

	const expandingCfg = typeof config.expanding === 'object' ? config.expanding : undefined
	const expandVariant = expandingCfg?.variant ?? 'sub-content'
	const { row: rowPinConfig } = normalizePinning(config.pinning)
	const hasPinning = Boolean(rowPinConfig && (rowPinConfig.top ?? rowPinConfig.bottom))

	const allColumns = buildColumnList(mappedUserColumns, {
		selection: hasSelection,
		expanding: hasExpanding,
		editing: hasEditing,
		deleting: hasDeleting,
		pinning: hasPinning,
	})

	const { left: pinnedLeft, right: pinnedRight } = extractPinningState(allColumns)

	// ── build TanStack options ────────────────────────────────────────────────
	const defaultPageSize =
		typeof config.pagination === 'object' && config.pagination.pageSize ? config.pagination.pageSize : 10

	const defaultHidden = collectDefaultHidden(config.columns)

	const initialState: Partial<TableState> = {
		columnPinning: { left: pinnedLeft, right: pinnedRight },
		pagination: { pageIndex: 0, pageSize: defaultPageSize },
		...(Object.keys(defaultHidden).length > 0 ? { columnVisibility: defaultHidden } : {}),
	}

	// We need a stable reference for the callback closure.
	// Using a wrapper object allows const + mutation inside the closure.
	const ref: { table: ReturnType<typeof createTanStackTable<TRow>> | null } = {
		table: null,
	}

	const onStateChange = (updater: Updater<TableState>): void => {
		const currentState = store.getState()
		const next = typeof updater === 'function' ? updater(currentState) : updater
		ref.table?.setOptions((prev) => ({ ...prev, state: next }))
		store.setState(next)
		config.onStateChange?.(updater)
	}

	// Build options without an explicit type annotation to avoid exactOptionalPropertyTypes
	// conflicts — let TypeScript infer, then cast at the call site.
	const onRowSelectionChange =
		typeof config.selection === 'object' && config.selection.onChange
			? (updater: Updater<RowSelectionState>): void => {
					const next = typeof updater === 'function' ? updater(store.getState().rowSelection) : updater
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
		...(config.expanding ? { getExpandedRowModel: getExpandedRowModel() } : {}),
		...(config.expanding && expandVariant === 'tree'
			? {
					getSubRows:
						expandingCfg?.getSubRows ??
						((row: TRow) => (row as Record<string, unknown>).children as TRow[] | undefined),
				}
			: {}),
		...(config.expanding && expandVariant === 'sub-content' && expandingCfg?.getRowCanExpand
			? { getRowCanExpand: expandingCfg.getRowCanExpand }
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
					columnResizeMode: typeof config.sizing === 'object' && config.sizing.mode ? config.sizing.mode : 'onChange',
					columnResizeDirection:
						typeof config.sizing === 'object' && config.sizing.direction ? config.sizing.direction : 'ltr',
				}
			: {}),
		// Row pinning — built-in TanStack feature, no separate row model needed
		...(hasPinning
			? {
					enableRowPinning: true,
					keepPinnedRows: false,
					pinning: rowPinConfig,
				}
			: {}),
		// Virtualization config — stored for React layer to read; no TanStack core effect
		...(config.virtualized !== undefined ? { virtualized: config.virtualized } : {}),
	}

	// Create the table. Features run getInitialState during this call.
	ref.table = createTanStackTable(options as unknown as TableOptionsResolved<TRow>)

	// Initialize store with the fully-merged initial state (includes feature states)
	store = createStore(ref.table.initialState)

	// Switch to fully-controlled mode with the real initial state
	ref.table.setOptions((prev) => ({ ...prev, state: store.getState() }))

	// Set initial loading state if provided
	if (config.loading === true) {
		ref.table.setLoading(true)
	}

	// ── compose the DataTable ─────────────────────────────────────────────────
	const dataTable = ref.table as DataTable<TRow>

	dataTable.subscribe = (listener) => store.subscribe(listener)

	dataTable.getSnapshot = () => store.getState()

	dataTable.setData = (data) => {
		ref.table?.setOptions((prev) => ({
			...prev,
			data,
		}))
		// Create a new snapshot reference so useSyncExternalStore detects the change
		store.setState((prev) => ({ ...prev }))
	}

	// Override setLoading to also call notify (it goes through setState → onStateChange)
	// Feature's setLoading already calls table.setState which triggers onStateChange → notify ✓

	return dataTable
}
