import {
	createTable as createTanStackTable,
	getCoreRowModel,
	getExpandedRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
} from '@tanstack/table-core'

import { mapColumns } from '../column/map-columns'
import { CreatingFeature } from '../features/creating'
import { DeletingFeature } from '../features/deleting'
import { EditingFeature } from '../features/editing'
import { InfiniteFeature } from '../features/infinite'
import { LoadingFeature } from '../features/loading'
import { buildOperatorRegistry } from '../features/operators'
import { createStore } from '../store'
import { buildColumnList, extractPinningState } from '../system-columns'
import { setIfDefined } from '../utils/set-if-defined'

import type { ColumnDef } from '../column/types'
import type {
	DataTable,
	GlobalFilterFn,
	MultiSortConfig,
	PinningConfig,
	RowPinningConfig,
	TableConfig,
} from '../types'
import type { RowSelectionState, TableOptionsResolved, TableState, Updater } from '@tanstack/table-core'

/** Translate our `sorting.multi` shape into TanStack option flags. */
function buildMultiSortOptions(multi: boolean | MultiSortConfig): Record<string, unknown> {
	if (multi === false) return { enableMultiSort: false }
	if (multi === true) return { enableMultiSort: true }
	const opts: Record<string, unknown> = { enableMultiSort: true }
	setIfDefined(opts, 'maxMultiSortColCount', multi.max)
	if (multi.removable === false) opts.enableMultiRemove = false
	if (multi.event === 'always') {
		opts.isMultiSortEvent = () => true
	} else if (multi.event === 'ctrl') {
		opts.isMultiSortEvent = (e: unknown) => {
			const event = e as { ctrlKey?: boolean; metaKey?: boolean } | null | undefined
			return Boolean(event?.ctrlKey) || Boolean(event?.metaKey)
		}
	}
	// 'shift' (default) → omit; TanStack's built-in handler already requires shift.
	return opts
}

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

	// ── faceted opt-in (table-level) ─────────────────────────────────────────
	const tableFaceted =
		typeof config.filtering === 'object' && config.filtering.faceted === true

	// Column-level opt-in: detect even when table-level flag is off so the row
	// models still attach when any single column requests faceted data.
	const hasColumnFaceted = config.columns.some(function check(c): boolean {
		const f = c.filtering
		if (f && typeof f === 'object' && f.faceted === true) return true
		if (c.columns) return c.columns.some(check)
		return false
	})
	const facetedNeeded = tableFaceted || hasColumnFaceted

	// ── map user columns → TanStack columns ──────────────────────────────────
	const mappedUserColumns = mapColumns(config.columns, operatorRegistry, { tableFaceted })

	const hasEditing = Boolean(config.editing)
	const hasDeleting = Boolean(config.deleting)
	const hasSelection = Boolean(config.selection)
	const hasExpanding = Boolean(config.expanding)

	const expandingCfg = typeof config.expanding === 'object' ? config.expanding : undefined
	const expandVariant = expandingCfg?.variant ?? 'sub-content'
	const normalizedPinning = normalizePinning(config.pinning)
	const rowPinConfig = normalizedPinning.row
	const hasPinning = Boolean(rowPinConfig && (rowPinConfig.top ?? rowPinConfig.bottom))

	const sortingCfg = typeof config.sorting === 'object' ? config.sorting : undefined
	const sortingOnChange = sortingCfg?.onChange

	// ── filtering / global filter gating ─────────────────────────────────────
	const hasColumnFiltering = Boolean(config.filtering)
	const hasGlobalFiltering = Boolean(config.globalFiltering)
	const hasAnyFiltering = hasColumnFiltering || hasGlobalFiltering

	const filteringCfg = typeof config.filtering === 'object' ? config.filtering : undefined
	const filteringOnChange = filteringCfg?.onChange
	const globalFilteringCfg = typeof config.globalFiltering === 'object' ? config.globalFiltering : undefined
	const globalFilteringOnChange = globalFilteringCfg?.onChange

	const paginationCfg = typeof config.pagination === 'object' ? config.pagination : undefined
	const paginationOnChange = paginationCfg?.onChange

	// Resolve `globalFilterFn`:
	// - inline function → used as-is
	// - string id → look up in user `fns` registry first; otherwise pass through
	//   so TanStack resolves built-in names like 'includesString' itself
	// - omitted → 'includesString' (overrides TanStack's 'auto' default so global
	//   search behaves as a predictable cross-column substring match)
	const resolvedGlobalFilterFn: GlobalFilterFn | string | undefined = ((): GlobalFilterFn | string | undefined => {
		if (!hasGlobalFiltering) return undefined
		const fn = globalFilteringCfg?.fn
		if (fn === undefined) return 'includesString'
		if (typeof fn === 'function') return fn
		const fromRegistry = globalFilteringCfg?.fns?.[fn]
		return fromRegistry ?? fn
	})()

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
		...(sortingCfg?.defaultSorting ? { sorting: sortingCfg.defaultSorting } : {}),
		// Consumer-provided seed wins over computed defaults (e.g. loading, sorting).
		...config.initialState,
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

		// Per-feature onChange — fire only when the relevant sub-state reference actually changed
		if (sortingOnChange && currentState.sorting !== next.sorting) {
			sortingOnChange(next.sorting)
		}
		if (filteringOnChange && currentState.columnFilters !== next.columnFilters) {
			filteringOnChange(next.columnFilters)
		}
		if (globalFilteringOnChange && currentState.globalFilter !== next.globalFilter) {
			globalFilteringOnChange(next.globalFilter)
		}
		if (paginationOnChange && currentState.pagination !== next.pagination) {
			paginationOnChange(next.pagination)
		}
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
		_features: [CreatingFeature, EditingFeature, DeletingFeature, LoadingFeature, InfiniteFeature],
		data: config.data,
		columns: allColumns,
		getRowId,
		state: initialState as TableState, // will be replaced below
		onStateChange,
		getCoreRowModel: getCoreRowModel(),
		initialState,
		// Sorting / Filtering / ColumnVisibility / ColumnPinning are gated at the
		// table level: when the corresponding config field is falsy (undefined or false),
		// the feature is fully OFF — TanStack's enableX:false makes column.getCanX()
		// return false for all columns regardless of per-column config, and the matching
		// getXRowModel is not attached. Truthy config (true or object) leaves the
		// TanStack default in place so per-column overrides keep working.
		...(config.sorting
			? { getSortedRowModel: getSortedRowModel() }
			: { enableSorting: false }),
		// Filtering: `getFilteredRowModel` is attached when either column filters
		// or global search is enabled. Each axis is gated independently:
		// - `filtering` falsy → enableColumnFilters: false (per-column UI disabled)
		// - `globalFiltering` falsy → enableGlobalFilter: false (search disabled)
		...(hasAnyFiltering ? { getFilteredRowModel: getFilteredRowModel() } : {}),
		...(hasColumnFiltering ? {} : { enableColumnFilters: false }),
		...(hasGlobalFiltering ? {} : { enableGlobalFilter: false }),
		// Faceted row models — only attached when at least one column or the table
		// opts in. Keeps the TanStack helpers tree-shakable when no multi-select
		// filter is in use.
		...(facetedNeeded
			? {
					getFacetedRowModel: getFacetedRowModel(),
					getFacetedUniqueValues: getFacetedUniqueValues(),
				}
			: {}),
		...(resolvedGlobalFilterFn !== undefined ? { globalFilterFn: resolvedGlobalFilterFn } : {}),
		...(config.columnVisibility ? {} : { enableHiding: false }),
		...(normalizedPinning.column ? {} : { enableColumnPinning: false }),
		// Infinite mode shows ALL accumulated rows — no client-side page slicing, no footer.
		...(config.pagination && paginationCfg?.mode !== 'infinite'
			? { getPaginationRowModel: getPaginationRowModel() }
			: {}),
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
		...(sortingCfg?.manual ? { manualSorting: true } : {}),
		// Sorting: per-direction default
		...(sortingCfg?.descFirst !== undefined ? { sortDescFirst: sortingCfg.descFirst } : {}),
		// Sorting: third-click removal
		...(sortingCfg?.removable === false ? { enableSortingRemoval: false } : {}),
		// Sorting: multi-column
		...(sortingCfg?.multi !== undefined ? buildMultiSortOptions(sortingCfg.multi) : {}),
		// Sorting: named comparator registry, addressable from `column.sorting.fn`
		...(sortingCfg?.fns ? { sortingFns: sortingCfg.fns } : {}),
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

	// ── compose the DataTable ─────────────────────────────────────────────────
	const dataTable = ref.table as DataTable<TRow>

	dataTable.subscribe = (listener) => store.subscribe(listener)

	dataTable.getSnapshot = () => store.getState()

	dataTable.setData = (data) => {
		ref.table?.setOptions((prev) => ({
			...prev,
			data,
		}))
		// Create a new snapshot reference so broad useSyncExternalStore subscribers
		// detect the change. Narrow per-slice subscribers do NOT re-render on this
		// (none of the slice references change). The main React adapter syncs
		// `data` via `setOptions` directly in render body; this path remains for
		// programmatic / non-React-driven updates.
		store.setState((prev) => ({ ...prev }))
	}

	dataTable.syncControlledState = (partial) => {
		ref.table?.setOptions((prev) => ({
			...prev,
			state: { ...prev.state, ...partial },
		}))
		store.setState((prev) => ({ ...prev, ...partial }))
	}

	// Forward infinite scroll: append rows after current data. Immutable — builds a
	// fresh array so broad snapshot subscribers re-render; the previous array is untouched.
	dataTable.appendData = (rows) => {
		const prev = ref.table?.options.data ?? []
		dataTable.setData([...prev, ...rows])
	}

	// Reserved v2 (backward/prepend). No scroll-anchoring in v1.
	dataTable.prependData = (rows) => {
		const prev = ref.table?.options.data ?? []
		dataTable.setData([...rows, ...prev])
	}

	return dataTable
}
