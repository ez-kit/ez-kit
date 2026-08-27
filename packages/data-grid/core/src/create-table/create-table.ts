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
import { buildColumnInvariants, enforceColumnInvariants, mergePinningSeed } from '../column-state'
import { DEFAULT_PAGE_SIZE, UNKNOWN_PAGE_COUNT } from '../defaults'
import { CreatingFeature } from '../features/creating'
import { APPLIED_STATE_KEY, DeferredApplyFeature } from '../features/deferred-apply'
import { DeletingFeature } from '../features/deleting'
import { EditingFeature } from '../features/editing'
import { InfiniteFeature } from '../features/infinite'
import { LoadingFeature } from '../features/loading'
import { buildOperatorRegistry } from '../features/operators'
import { RowActionsVariant } from '../features/row-actions'
import { createStore } from '../store'
import { buildColumnList, extractPinningState } from '../system-columns'
import { featureConfig, isFeatureEnabled } from '../utils/feature-flag'
import { setIfDefined } from '../utils/set-if-defined'

import type { ColumnDef } from '../column/types'
import type { AppliedState } from '../features/deferred-apply'
import type { DataTable, GlobalFilterFn, MultiSortConfig, PinningConfig, RowPinningConfig, TableConfig } from '../types'
import type { TableOptionsResolved, TableState, Updater } from '@tanstack/table-core'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectInitialHidden<TRow extends object>(defs: ColumnDef<TRow, any>[]): Record<string, boolean> {
	const acc: Record<string, boolean> = {}
	for (const def of defs) {
		if (def.visibility && typeof def.visibility === 'object' && def.visibility.initialHidden) {
			const colId = def.id ?? def.accessorKey
			if (colId !== undefined) acc[colId] = false
		}
		if (def.columns !== undefined) {
			Object.assign(acc, collectInitialHidden(def.columns))
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
/** Axes whose deferred draft `syncControlledState` must not let controlled input clobber. */
const DRAFT_AXES = ['sorting', 'columnFilters', 'globalFilter'] as const

export function createTable<TRow extends object>(config: TableConfig<TRow>): DataTable<TRow> {
	// ── resolved feature options ─────────────────────────────────────────────
	// Every feature is read through `isFeatureEnabled` / `featureConfig` exactly once, here.
	// A config object means "on with these settings" unless it carries `enabled: false`, and
	// `featureConfig` returns `undefined` for a feature that is off — so a disabled feature
	// never contributes its `manual`, `onChange` or `fn` to the built table.
	const sortingCfg = featureConfig(config.sorting)
	const filteringCfg = featureConfig(config.filtering)
	const globalFilteringCfg = featureConfig(config.globalFiltering)
	const paginationCfg = featureConfig(config.pagination)
	const selectionCfg = featureConfig(config.selection)
	const expandingCfg = featureConfig(config.expanding)
	const resizingCfg = featureConfig(config.resizing)
	const creatingCfg = featureConfig(config.creating)
	const editingCfg = featureConfig(config.editing)
	const deletingCfg = featureConfig(config.deleting)

	const hasSorting = isFeatureEnabled(config.sorting)
	const hasColumnFiltering = isFeatureEnabled(config.filtering)
	const hasGlobalFiltering = isFeatureEnabled(config.globalFiltering)
	const hasPagination = isFeatureEnabled(config.pagination)
	const hasSelection = isFeatureEnabled(config.selection)
	const hasExpanding = isFeatureEnabled(config.expanding)
	const hasResizing = isFeatureEnabled(config.resizing)
	const hasEditing = isFeatureEnabled(config.editing)
	const hasDeleting = isFeatureEnabled(config.deleting)

	if (config.deferredApply === true) {
		const sortingManual = sortingCfg?.manual === true
		const filteringManual = filteringCfg?.manual === true
		if (!sortingManual && !filteringManual) {
			throw new Error(
				'deferredApply requires `manual: true` on at least one of `sorting` or `filtering`. ' +
					'Client-side deferral is not supported: without manual mode the row models recompute ' +
					'on every draft edit, so nothing is actually deferred.',
			)
		}
	}

	let store = createStore<TableState>({} as TableState)

	// ── row identity ─────────────────────────────────────────────────────────
	const getRowId =
		config.getRowId ??
		((row: TRow, index: number): string => {
			const id = (row as Record<string, unknown>).id
			return id != null ? String(id) : String(index)
		})

	// ── operator registry ────────────────────────────────────────────────────
	const tableFilteringOperators = filteringCfg?.operators
	const operatorRegistry = buildOperatorRegistry(tableFilteringOperators)

	// ── faceted opt-in (table-level) ─────────────────────────────────────────
	const tableFaceted = filteringCfg?.faceted === true

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

	const expandMode = expandingCfg?.mode ?? 'sub-content'
	const normalizedPinning = normalizePinning(config.pinning)
	const rowPinConfig = normalizedPinning.row
	const hasPinning = Boolean(rowPinConfig && (rowPinConfig.top ?? rowPinConfig.bottom))

	const sortingOnChange = sortingCfg?.onChange

	// ── filtering / global filter gating ─────────────────────────────────────
	const hasAnyFiltering = hasColumnFiltering || hasGlobalFiltering

	const filteringOnChange = filteringCfg?.onChange
	const globalFilteringOnChange = globalFilteringCfg?.onChange
	const paginationOnChange = paginationCfg?.onChange
	const selectionOnChange = selectionCfg?.onChange
	const columnVisibilityOnChange = featureConfig(config.columnVisibility)?.onChange
	const pinningCfgResolved = featureConfig(config.pinning)
	const columnPinningOnChange =
		typeof pinningCfgResolved?.column === 'object' ? pinningCfgResolved.column.onChange : undefined
	const rowPinningOnChange = typeof pinningCfgResolved?.row === 'object' ? pinningCfgResolved.row.onChange : undefined
	const resizingOnChange = featureConfig(config.resizing)?.onChange
	const expandingOnChange = featureConfig(config.expanding)?.onChange

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

	const rowActionsVariant = config.rowActions?.variant ?? RowActionsVariant.Inline

	const allColumns = buildColumnList(mappedUserColumns, {
		selection: hasSelection,
		expanding: hasExpanding,
		editing: hasEditing,
		deleting: hasDeleting,
		pinning: hasPinning,
		rowActionsVariant,
	})

	const { left: pinnedLeft, right: pinnedRight } = extractPinningState(allColumns)

	// ── build TanStack options ────────────────────────────────────────────────
	const defaultPageSize = paginationCfg?.pageSize ?? DEFAULT_PAGE_SIZE

	const initialHidden = collectInitialHidden(config.columns)

	// Column-derived rules that no state input may violate — see `../column-state`.
	const columnInvariants = buildColumnInvariants(allColumns)

	const userInitialState = config.initialState
	// `columnPinning` / `columnVisibility` merge with the column-derived defaults instead of
	// replacing them: a whole-slice spread would silently drop static pins, system-column pins
	// and `initialHidden` columns the consumer never mentioned.
	const seededPinning = mergePinningSeed({ left: pinnedLeft, right: pinnedRight }, userInitialState?.columnPinning)
	const mergedVisibility = { ...initialHidden, ...userInitialState?.columnVisibility }
	// Same reason as the two above, and the one slice where it was missed: spreading
	// `userInitialState` replaces `pagination` wholesale, so seeding only `pageIndex`
	// (a deep link to page 3) dropped the resolved `pageSize` to `undefined`.
	const mergedPagination = {
		pageIndex: 0,
		pageSize: defaultPageSize,
		...userInitialState?.pagination,
	}

	const initialState: Partial<TableState> = enforceColumnInvariants(
		{
			// Consumer-provided seed wins over computed defaults (e.g. loading, sorting).
			...userInitialState,
			pagination: mergedPagination,
			columnPinning: seededPinning,
			...(Object.keys(mergedVisibility).length > 0 ? { columnVisibility: mergedVisibility } : {}),
		},
		columnInvariants,
	)

	// We need a stable reference for the callback closure.
	// Using a wrapper object allows const + mutation inside the closure.
	const ref: { table: ReturnType<typeof createTanStackTable<TRow>> | null } = {
		table: null,
	}

	const deferred = config.deferredApply === true

	/**
	 * The snapshot the outside world is allowed to see: the three deferrable axes
	 * replaced by the applied snapshot, and `applied` itself dropped. With
	 * `deferredApply` off this is the identity function.
	 *
	 * The `applied` guard covers the window before the store is rebuilt from
	 * `table.initialState` below, where a state change raised during construction
	 * would otherwise read the slice off an empty snapshot.
	 */
	const toOutward = (state: TableState): TableState => {
		if (!deferred) return state
		const applied = state.applied as AppliedState | undefined
		if (applied === undefined) return state
		const { applied: _dropped, ...rest } = state
		return {
			...rest,
			sorting: applied.sorting,
			columnFilters: applied.columnFilters,
			globalFilter: applied.globalFilter,
		} as TableState
	}

	/**
	 * Reference comparison across **every** slice the outward snapshot carries,
	 * derived from the objects rather than a hand-written list. A slice omitted
	 * from a fixed list would be a state change that silently never reaches the
	 * consumer while `deferredApply` is on — a far worse failure than one extra
	 * emission, and one that grows every time a feature adds a slice.
	 */
	const outwardUnchanged = (a: TableState, b: TableState): boolean => {
		const keys = new Set([...Object.keys(a), ...Object.keys(b)])
		for (const key of keys) {
			if (key === APPLIED_STATE_KEY) continue
			if ((a as unknown as Record<string, unknown>)[key] !== (b as unknown as Record<string, unknown>)[key]) {
				return false
			}
		}
		return true
	}

	/**
	 * With `deferredApply` off there is no draft, so the applied snapshot must track
	 * the live axes — otherwise `table.draft.isDirty()` would report a phantom draft
	 * for every consumer that never opted in. Returns the same object when already
	 * in sync so the funnel's reference comparisons stay meaningful.
	 */
	const syncApplied = (state: TableState): TableState => {
		const applied = state.applied as AppliedState | undefined
		if (
			applied === undefined ||
			(applied.sorting === state.sorting &&
				applied.columnFilters === state.columnFilters &&
				applied.globalFilter === state.globalFilter)
		) {
			return state
		}
		return {
			...state,
			applied: { sorting: state.sorting, columnFilters: state.columnFilters, globalFilter: state.globalFilter },
		}
	}

	const onStateChange = (updater: Updater<TableState>): void => {
		const currentState = store.getState()
		const requested = typeof updater === 'function' ? updater(currentState) : updater
		const enforced = enforceColumnInvariants(requested, columnInvariants)
		const next = deferred ? enforced : syncApplied(enforced)
		ref.table?.setOptions((prev) => ({ ...prev, state: next }))
		store.setState(next)

		const outwardPrev = toOutward(currentState)
		const outwardNext = toOutward(next)

		// A draft edit changes nothing the consumer is allowed to see. Emitting an
		// identical snapshot would be noise at best and a duplicate request at
		// worst, so the funnel stays silent and "onStateChange fired" keeps meaning
		// "the query changed".
		if (deferred && outwardUnchanged(outwardPrev, outwardNext)) return

		config.onStateChange?.(outwardNext)

		// Per-feature onChange — fire only when the relevant sub-state reference actually changed
		if (sortingOnChange && outwardPrev.sorting !== outwardNext.sorting) {
			sortingOnChange(outwardNext.sorting)
		}
		if (filteringOnChange && outwardPrev.columnFilters !== outwardNext.columnFilters) {
			filteringOnChange(outwardNext.columnFilters)
		}
		if (globalFilteringOnChange && outwardPrev.globalFilter !== outwardNext.globalFilter) {
			globalFilteringOnChange(outwardNext.globalFilter)
		}
		if (paginationOnChange && outwardPrev.pagination !== outwardNext.pagination) {
			paginationOnChange(outwardNext.pagination)
		}
		// Selection goes through this funnel like the rest, and deliberately NOT through
		// TanStack's `onRowSelectionChange`: that option *replaces* the built-in state writer
		// (`makeStateUpdater`), so supplying it to carry a callback silently stopped the
		// selection from ever being recorded — `selection: { onChange }` disabled the checkboxes.
		if (selectionOnChange && outwardPrev.rowSelection !== outwardNext.rowSelection) {
			const selection = outwardNext.rowSelection
			selectionOnChange(
				selection,
				Object.keys(selection).filter((id) => selection[id]),
			)
		}
		if (columnVisibilityOnChange && outwardPrev.columnVisibility !== outwardNext.columnVisibility) {
			columnVisibilityOnChange(outwardNext.columnVisibility)
		}
		if (columnPinningOnChange && outwardPrev.columnPinning !== outwardNext.columnPinning) {
			columnPinningOnChange(outwardNext.columnPinning)
		}
		if (rowPinningOnChange && outwardPrev.rowPinning !== outwardNext.rowPinning) {
			rowPinningOnChange(outwardNext.rowPinning)
		}
		// `columnSizing` only — `columnSizingInfo` churns on every pointer move mid-drag.
		if (resizingOnChange && outwardPrev.columnSizing !== outwardNext.columnSizing) {
			resizingOnChange(outwardNext.columnSizing)
		}
		if (expandingOnChange && outwardPrev.expanded !== outwardNext.expanded) {
			expandingOnChange(outwardNext.expanded)
		}
	}

	// Build options without an explicit type annotation to avoid exactOptionalPropertyTypes
	// conflicts — let TypeScript infer, then cast at the call site.
	const options = {
		_features: [
			CreatingFeature,
			DeferredApplyFeature,
			EditingFeature,
			DeletingFeature,
			LoadingFeature,
			InfiniteFeature,
		],
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
		...(hasSorting ? { getSortedRowModel: getSortedRowModel() } : { enableSorting: false }),
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
		// `isFeatureEnabled`, not `=== true`: the option grew a config object (for `onChange`),
		// and a strict boolean check would have left `{ onChange }` reading as "off".
		...(isFeatureEnabled(config.columnVisibility) ? {} : { enableHiding: false }),
		...(normalizedPinning.column ? {} : { enableColumnPinning: false }),
		// Infinite mode shows ALL accumulated rows — no client-side page slicing, no footer.
		...(hasPagination && paginationCfg?.mode !== 'infinite' ? { getPaginationRowModel: getPaginationRowModel() } : {}),
		...(hasExpanding ? { getExpandedRowModel: getExpandedRowModel() } : {}),
		...(hasExpanding && expandMode === 'tree'
			? {
					getSubRows:
						expandingCfg?.getSubRows ??
						((row: TRow) => (row as Record<string, unknown>).children as TRow[] | undefined),
				}
			: {}),
		...(hasExpanding && expandMode === 'sub-content' && expandingCfg?.getRowCanExpand
			? { getRowCanExpand: expandingCfg.getRowCanExpand }
			: {}),
		// Row selection
		enableRowSelection: hasSelection,
		// Pagination manual
		...(paginationCfg?.manual
			? {
					manualPagination: true,
					// When rowCount is provided, omit pageCount so TanStack derives it
					// automatically from rowCount ÷ pageSize. When only pageCount is
					// given (or neither), fall back to the explicit value or -1 (unknown).
					...(paginationCfg.rowCount !== undefined
						? { rowCount: paginationCfg.rowCount }
						: { pageCount: paginationCfg.pageCount ?? UNKNOWN_PAGE_COUNT }),
				}
			: {}),
		// Filtering manual
		...(filteringCfg?.manual ? { manualFiltering: true } : {}),
		// Sorting manual
		...(sortingCfg?.manual ? { manualSorting: true } : {}),
		// Sorting: per-direction default
		...(sortingCfg?.descFirst !== undefined ? { sortDescFirst: sortingCfg.descFirst } : {}),
		// Sorting: third-click removal
		...(sortingCfg?.clearable === false ? { enableSortingRemoval: false } : {}),
		// Sorting: multi-column
		...(sortingCfg?.multi !== undefined ? buildMultiSortOptions(sortingCfg.multi) : {}),
		// Sorting: named comparator registry, addressable from `column.sorting.fn`
		...(sortingCfg?.fns ? { sortingFns: sortingCfg.fns } : {}),
		// Feature configs
		...(creatingCfg ? { creating: creatingCfg } : {}),
		...(editingCfg ? { editing: editingCfg } : {}),
		...(deletingCfg ? { deleting: deletingCfg } : {}),
		// Read by the React layer to lay out the actions cell (inline vs. menu).
		rowActions: { variant: rowActionsVariant },
		// Column resizing
		...(hasResizing
			? {
					enableColumnResizing: true,
					columnResizeMode: resizingCfg?.mode ?? 'onChange',
					columnResizeDirection: resizingCfg?.direction ?? 'ltr',
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
		// Mirrored onto options so the React layer can gate the draft UI on the flag itself.
		...(deferred ? { deferredApply: true } : {}),
		// Virtualization config — stored for React layer to read; no TanStack core effect
		...(isFeatureEnabled(config.virtualization) ? { virtualization: config.virtualization } : {}),
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
	// Frozen at construction: a server render must produce the same tree on every call, so it
	// cannot read a store that a client-side interaction may already have advanced.
	const initialSnapshot = store.getState()
	dataTable.getInitialSnapshot = () => initialSnapshot

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

	dataTable.syncControlledState = (partial, options) => {
		// While a draft is pending, the consumer only ever saw the last APPLIED query —
		// what it mirrors back for the three deferrable axes is stale by construction.
		// Accepting it would silently discard whatever the user is composing.
		const incoming =
			deferred && ref.table?.draft.isDirty() === true
				? (Object.fromEntries(
						Object.entries(partial).filter(([key]) => !(DRAFT_AXES as readonly string[]).includes(key)),
					) as typeof partial)
				: partial
		const safe = enforceColumnInvariants(incoming, columnInvariants)
		ref.table?.setOptions((prev) => ({
			...prev,
			state: { ...prev.state, ...safe },
		}))
		store.setState((prev) => ({ ...prev, ...safe }), options)
	}

	dataTable.notifyStateSubscribers = () => {
		store.notify()
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
