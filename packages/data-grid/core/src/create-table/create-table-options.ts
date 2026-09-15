import {
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
import { CreatingFeature, CreatingMode } from '../features/creating'
import { DeferredApplyFeature } from '../features/deferred-apply'
import { DeletingFeature } from '../features/deleting'
import { EditingFeature, EditingMode } from '../features/editing'
import { InfiniteFeature } from '../features/infinite'
import { LoadingFeature } from '../features/loading'
import { buildOperatorRegistry } from '../features/operators'
import { RowOrderingFeature } from '../features/ordering'
import { RowActionsPlacement } from '../features/row-actions'
import { buildColumnList, extractPinningState } from '../system-columns'
import { ColumnResizeMode, ExpandingMode, GridDirection, MultiSortEvent, PaginationMode } from '../types'
import { featureConfig, isFeatureEnabled } from '../utils/feature-flag'
import { setIfDefined } from '../utils/set-if-defined'

import type { ColumnDef, SystemColumnDef } from '../column/types'
import type {
	GlobalFilterFn,
	MultiSortConfig,
	PinningConfig,
	RowPinningConfig,
	SortingState,
	TableConfig,
} from '../types'
import type {
	ColumnFiltersState,
	ColumnOrderState,
	ColumnPinningState,
	ColumnSizingState,
	ExpandedState,
	PaginationState,
	RowPinningState,
	RowSelectionState,
	TableState,
	VisibilityState,
} from '@tanstack/table-core'

/** Translate our `sorting.multi` shape into TanStack option flags. */
function buildMultiSortOptions(multi: boolean | MultiSortConfig): Record<string, unknown> {
	if (multi === false) return { enableMultiSort: false }
	if (multi === true) return { enableMultiSort: true }
	const opts: Record<string, unknown> = { enableMultiSort: true }
	setIfDefined(opts, 'maxMultiSortColCount', multi.max)
	if (multi.removable === false) opts.enableMultiRemove = false
	if (multi.event === MultiSortEvent.Always) {
		opts.isMultiSortEvent = () => true
	} else if (multi.event === MultiSortEvent.Ctrl) {
		opts.isMultiSortEvent = (e: unknown) => {
			const event = e as { ctrlKey?: boolean; metaKey?: boolean } | null | undefined
			return Boolean(event?.ctrlKey) || Boolean(event?.metaKey)
		}
	}
	// MultiSortEvent.Shift (default) → omit; TanStack's built-in handler already requires shift.
	return opts
}

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * Warn about a column seeded into a state the user can never leave.
 *
 * `visibility: { initialHidden }` and `pinning: { initialSide }` both say "starts this way, the
 * user changes it from here" — but the affordance that lets them change it belongs to the
 * *table*-level feature. With that feature off the seed still applies (a seed is what the
 * developer wrote, and silently dropping it would be worse), so the column starts hidden or
 * pinned with no route back: `initialSide` becomes indistinguishable from the static `side`,
 * and an `initialHidden` column simply never appears.
 *
 * Both are legitimate configurations — a column can exist in the model without being shown, and
 * its values still feed global search. So this is a warning, not an error, and it is stripped
 * from production builds.
 */
function warnUnreachableSeed(columnId: string, seed: string, feature: string): void {
	console.warn(
		`[data-grid] Column "${columnId}" sets \`${seed}\`, but the table-level \`${feature}\` feature is off, ` +
			`so nothing can change it back — the seed becomes permanent. ` +
			`Enable \`${feature}\` on the table to give the user that control, or drop the seed.`,
	)
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

/**
 * Ids of columns seeded with `pinning: { initialSide }`. Only the dynamic seed — a static
 * `pinning: 'left'` / `{ side }` is meant to be unchangeable, so it has nothing to warn about.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectInitialPinned<TRow extends object>(defs: ColumnDef<TRow, any>[]): string[] {
	const acc: string[] = []
	for (const def of defs) {
		if (def.pinning && typeof def.pinning === 'object' && def.pinning.initialSide !== undefined) {
			const colId = def.id ?? def.accessorKey
			if (colId !== undefined) acc.push(colId)
		}
		if (def.columns !== undefined) {
			acc.push(...collectInitialPinned(def.columns))
		}
	}
	return acc
}

function normalizePinning(pinning: boolean | PinningConfig | undefined): {
	column: boolean
	row: RowPinningConfig | false
} {
	if (!isFeatureEnabled(pinning)) return { column: false, row: false }
	if (pinning === true) return { column: true, row: { top: true, bottom: true } }
	const config = featureConfig(pinning)
	if (!config) return { column: false, row: false }
	// Both halves take the same `boolean | Config` shape every feature option takes, `enabled`
	// included: a defaults layer that configured row pinning app-wide is turned off for one grid
	// with `pinning: { row: { enabled: false } }`, without restating its settings.
	const rowCfg = config.row
	const row: RowPinningConfig | false = rowCfg === true ? { top: true, bottom: true } : (featureConfig(rowCfg) ?? false)
	return { column: isFeatureEnabled(config.column), row }
}

/**
 * The eleven per-feature callbacks, resolved from config and keyed by feature.
 *
 * They are carried as data rather than called here: resolving them is config work, firing them
 * is the business of `createTable`'s state funnel.
 */
export type FeatureOnChangeHandlers = {
	sorting?: ((next: SortingState) => void) | undefined
	filtering?: ((next: ColumnFiltersState) => void) | undefined
	globalFiltering?: ((next: unknown) => void) | undefined
	pagination?: ((next: PaginationState) => void) | undefined
	selection?: ((next: RowSelectionState, ids: string[]) => void) | undefined
	visibility?: ((next: VisibilityState) => void) | undefined
	columnOrdering?: ((next: ColumnOrderState) => void) | undefined
	columnPinning?: ((next: ColumnPinningState) => void) | undefined
	rowPinning?: ((next: RowPinningState) => void) | undefined
	resizing?: ((next: ColumnSizingState) => void) | undefined
	expanding?: ((next: ExpandedState) => void) | undefined
}

/**
 * Resolve a {@link TableConfig} into the TanStack options that describe it — purely.
 *
 * Everything here is a function of `config` alone: no store, no table instance, no live wiring.
 * `state` and `onStateChange` are deliberately absent from the returned `options`; they are the
 * controlled half, and `createTable` supplies them at the construction site.
 */
export function createTableOptions<TRow extends object>(config: TableConfig<TRow>) {
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
	// Cell editing is entered by double-clicking the cell itself, never from the actions column:
	// the pencil there calls `editing.start(rowId)`, which is the row flow and opens nothing in
	// this mode. So it is not a reason to mount the actions column, nor to reserve its width.
	const hasRowEditAction = hasEditing && editingCfg?.mode !== EditingMode.Cell
	const hasDeleting = isFeatureEnabled(config.deleting)
	const hasInlineCreating = isFeatureEnabled(config.creating) && creatingCfg?.mode !== CreatingMode.Modal
	const hasPinRowCreating = hasInlineCreating && creatingCfg?.mode === CreatingMode.PinRow

	const hasDraft = isFeatureEnabled(config.draft)

	if (hasDraft) {
		const sortingManual = sortingCfg?.manual === true
		const filteringManual = filteringCfg?.manual === true
		const globalFilteringManual = globalFilteringCfg?.manual === true
		if (!sortingManual && !filteringManual && !globalFilteringManual) {
			throw new Error(
				'`draft` requires `manual: true` on at least one of `sorting`, `filtering` or `globalFiltering`. ' +
					'Client-side deferral is not supported: without manual mode the row models recompute ' +
					'on every draft edit, so nothing is actually deferred.',
			)
		}
	}

	const deferred = hasDraft

	// ── row identity ─────────────────────────────────────────────────────────
	const getRowId =
		config.getRowId ??
		((row: TRow, index: number): string => {
			const id = (row as Record<string, unknown>).id
			return id != null ? String(id) : String(index)
		})

	// ── operator registry ────────────────────────────────────────────────────
	// One option, two jobs: `items` seeds the registry, and the option's presence is the
	// table-wide switch every column falls back to. `undefined` is a third state — neither on
	// nor off — so a table that never mentions operators keeps the per-column opt-in.
	const tableOperatorsCfg = filteringCfg?.operators
	const operatorRegistry = buildOperatorRegistry(
		typeof tableOperatorsCfg === 'object' ? tableOperatorsCfg.items : undefined,
	)
	const tableOperators: boolean | undefined = tableOperatorsCfg === undefined ? undefined : tableOperatorsCfg !== false

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
	const mappedUserColumns = mapColumns(config.columns, operatorRegistry, {
		tableFaceted,
		...(tableOperators !== undefined ? { tableOperators } : {}),
	})

	const expandMode = expandingCfg?.mode ?? ExpandingMode.SubContent
	const normalizedPinning = normalizePinning(config.pinning)
	const rowPinConfig = normalizedPinning.row
	const hasPinning = Boolean(rowPinConfig && (rowPinConfig.top ?? rowPinConfig.bottom))

	// ── filtering / global filter gating ─────────────────────────────────────
	const hasAnyFiltering = hasColumnFiltering || hasGlobalFiltering

	// `ordering` groups the axes, so the callback hangs off the axis, not the group — the same
	// shape `pinning.column` / `pinning.row` already use.
	const orderingCfgResolved = featureConfig(config.ordering)
	const columnOrderingOnChange =
		typeof orderingCfgResolved?.column === 'object' ? orderingCfgResolved.column.onChange : undefined
	// The row axis turns on only by being named: a bare `ordering: true` is columns, and keeps
	// being columns, so an upgrade cannot hand an existing grid an affordance nobody asked for.
	// Resolved to the config object the feature reads, or `undefined` when the axis is off —
	// see `TableOptionsResolved.rowOrdering`.
	const rowOrderingCfg = isFeatureEnabled(orderingCfgResolved?.row)
		? (featureConfig(orderingCfgResolved?.row) ?? {})
		: undefined
	const pinningCfgResolved = featureConfig(config.pinning)
	const columnPinningOnChange =
		typeof pinningCfgResolved?.column === 'object' ? pinningCfgResolved.column.onChange : undefined
	const rowPinningOnChange = typeof pinningCfgResolved?.row === 'object' ? pinningCfgResolved.row.onChange : undefined

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

	// `rowActions` defaults to on: omitting it must keep the actions column appearing as soon as
	// editing / deleting / row pinning is in play, which is what it has always done. Only an
	// explicit `false` (or `{ enabled: false }`) suppresses the column outright — the read-only
	// escape hatch for one grid under a defaults layer that configured row actions app-wide.
	const rowActionsEnabled = config.rowActions === undefined || isFeatureEnabled(config.rowActions)
	const rowActionsCfg = featureConfig(config.rowActions)
	const rowActionsPlacement = rowActionsCfg?.placement ?? RowActionsPlacement.Inline
	const customRowActions = rowActionsCfg?.actions

	// Row-erased on the way in, like every other structural setting the mapper carries: a system
	// column renders no row value, so nothing downstream has a `TRow` left to keep.
	const selectionColumn = selectionCfg?.column as SystemColumnDef | undefined
	const expandingColumn = featureConfig(config.expanding)?.column as SystemColumnDef | undefined
	const rowActionsColumn = rowActionsCfg?.column as SystemColumnDef | undefined

	// Where an inline draft row puts its save / cancel pair. It shares the actions cell with the
	// row actions — but only when that column is there anyway, or when the draft row itself is
	// permanent. `mode: 'row'` in a grid with no row actions deliberately does **not** mount it:
	// the column would sit empty until someone pressed the create trigger, and mounting it on
	// open would take its fixed width off the `1fr` tracks, so every column would jump on each
	// open and again on each close. Such a grid puts the pair in the toolbar instead, in place of
	// the create trigger (data-grid-react `create-trigger.tsx`) — the toolbar is already there,
	// so nothing reflows. `mode: 'modal'` needs neither: the dialog has its own footer.
	const hasOtherRowActions =
		rowActionsEnabled &&
		(hasRowEditAction || hasDeleting || hasPinning || rowOrderingCfg !== undefined || customRowActions !== undefined)
	const creatingInActionsColumn = hasPinRowCreating || (hasInlineCreating && hasOtherRowActions)

	const allColumns = buildColumnList(mappedUserColumns, {
		selection: hasSelection,
		expanding: hasExpanding,
		editing: rowActionsEnabled && hasRowEditAction,
		deleting: rowActionsEnabled && hasDeleting,
		pinning: rowActionsEnabled && hasPinning,
		ordering: rowActionsEnabled && rowOrderingCfg !== undefined,
		creating: creatingInActionsColumn,
		rowActionsPlacement,
		customRowActions: rowActionsEnabled && customRowActions !== undefined,
		...(selectionColumn !== undefined ? { selectionColumn } : {}),
		...(expandingColumn !== undefined ? { expandingColumn } : {}),
		...(rowActionsColumn !== undefined ? { rowActionsColumn } : {}),
	})

	const { left: pinnedLeft, right: pinnedRight } = extractPinningState(allColumns)

	// ── build TanStack options ────────────────────────────────────────────────
	const defaultPageSize = paginationCfg?.pageSize ?? DEFAULT_PAGE_SIZE

	const initialHidden = collectInitialHidden(config.columns)

	// The seeds still apply with their feature off — see `warnUnreachableSeed` — but say so.
	if (IS_DEV) {
		if (!isFeatureEnabled(config.visibility)) {
			for (const columnId of Object.keys(initialHidden)) {
				warnUnreachableSeed(columnId, 'visibility.initialHidden', 'visibility')
			}
		}
		if (!normalizedPinning.column) {
			for (const columnId of collectInitialPinned(config.columns)) {
				warnUnreachableSeed(columnId, 'pinning.initialSide', 'pinning')
			}
		}
	}

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

	// Two routes to one value, kept on purpose: `pagination.pageSize` is where an author states
	// the size, `initialState.pagination.pageSize` is where a deep link restores the one the user
	// picked. They only collide when both are written, and then the seed — the more specific,
	// per-mount one — wins silently. Say so in development rather than leaving it to be found by
	// a page that opens on a size nobody asked for.
	if (IS_DEV && paginationCfg?.pageSize !== undefined && userInitialState?.pagination?.pageSize !== undefined) {
		console.warn(
			`[data-grid] Both \`pagination.pageSize\` (${String(paginationCfg.pageSize)}) and ` +
				`\`initialState.pagination.pageSize\` (${String(userInitialState.pagination.pageSize)}) are set. ` +
				`The seed wins; the option is ignored. Set one of them.`,
		)
	}

	// Row ordering records an order as row ids, and a row with no `id` field falls back to its
	// index — which changes the moment a row moves, so the recorded order would refer to
	// whichever rows now sit in those positions. This is the feature's one real
	// misconfiguration, and it is silent without saying so.
	if (IS_DEV && rowOrderingCfg !== undefined && config.getRowId === undefined) {
		const first = config.data[0] as Record<string, unknown> | undefined
		if (first !== undefined && first.id == null) {
			console.warn(
				'[data-grid] `ordering: { row: ... }` needs a stable `getRowId`. These rows have no `id`, ' +
					'so a row id is its index, which changes as soon as a row moves — the order would then ' +
					'refer to the wrong rows.',
			)
		}
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
			RowOrderingFeature,
		],
		data: config.data,
		columns: allColumns,
		getRowId,
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
		...(isFeatureEnabled(config.visibility) ? {} : { enableHiding: false }),
		...(normalizedPinning.column ? {} : { enableColumnPinning: false }),
		// Infinite mode shows ALL accumulated rows — no client-side page slicing, no footer.
		...(hasPagination && paginationCfg?.mode !== PaginationMode.Infinite
			? { getPaginationRowModel: getPaginationRowModel() }
			: {}),
		...(hasExpanding ? { getExpandedRowModel: getExpandedRowModel() } : {}),
		...(hasExpanding && expandMode === ExpandingMode.Tree
			? {
					getSubRows:
						expandingCfg?.getSubRows ??
						((row: TRow) => (row as Record<string, unknown>).children as TRow[] | undefined),
				}
			: {}),
		...(hasExpanding && expandMode === ExpandingMode.SubContent && expandingCfg?.getRowCanExpand
			? { getRowCanExpand: expandingCfg.getRowCanExpand }
			: {}),
		// Row selection
		enableRowSelection: hasSelection,
		// Single-row selection. TanStack defaults `enableMultiRowSelection` to true, so the gate
		// has to be spelled out — the same shape as the `enableHiding` / `enableColumnResizing`
		// gates above.
		...(selectionCfg?.multi === false ? { enableMultiRowSelection: false } : {}),
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
		// Filtering manual — TanStack has a single `manualFiltering` switch covering both column
		// filters and global search, so either axis asking for manual mode turns it on for both.
		...(filteringCfg?.manual || globalFilteringCfg?.manual ? { manualFiltering: true } : {}),
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
		...(rowOrderingCfg ? { rowOrdering: rowOrderingCfg } : {}),
		...(creatingCfg ? { creating: creatingCfg } : {}),
		...(editingCfg ? { editing: editingCfg } : {}),
		...(deletingCfg ? { deleting: deletingCfg } : {}),
		// Read by the React layer to lay out the actions cell (inline vs. menu).
		rowActions: {
			placement: rowActionsPlacement,
			...(rowActionsEnabled && customRowActions ? { actions: customRowActions } : {}),
		},
		// The grid's text direction, declared once at the root. Set unconditionally: it is a fact
		// about the grid, not a resize setting, so it does not wait for `resizing` to be on.
		columnResizeDirection: config.direction ?? GridDirection.Ltr,
		// Column resizing
		...(hasResizing
			? {
					enableColumnResizing: true,
					columnResizeMode: resizingCfg?.mode ?? ColumnResizeMode.OnChange,
				}
			: // TanStack defaults `enableColumnResizing` to true, so the table-level gate has to be
				// spelled out explicitly — otherwise `column.getCanResize()` stays true with the
				// feature off. Same shape as the `enableHiding: false` gate above.
				{ enableColumnResizing: false }),
		// Row pinning — built-in TanStack feature, no separate row model needed
		...(hasPinning
			? {
					enableRowPinning: true,
					keepPinnedRows: false,
					pinning: rowPinConfig,
				}
			: {}),
		// Mirrored onto options so the React layer can gate the draft UI on the flag itself.
		...(deferred ? { draft: true } : {}),
		// Virtualization config — stored for React layer to read; no TanStack core effect
		...(isFeatureEnabled(config.virtualization) ? { virtualization: config.virtualization } : {}),
	}

	const onChange: FeatureOnChangeHandlers = {
		sorting: sortingCfg?.onChange,
		filtering: filteringCfg?.onChange,
		globalFiltering: globalFilteringCfg?.onChange,
		pagination: paginationCfg?.onChange,
		selection: selectionCfg?.onChange,
		visibility: featureConfig(config.visibility)?.onChange,
		columnOrdering: columnOrderingOnChange,
		columnPinning: columnPinningOnChange,
		rowPinning: rowPinningOnChange,
		resizing: featureConfig(config.resizing)?.onChange,
		expanding: featureConfig(config.expanding)?.onChange,
	}

	return { options, initialState, columnInvariants, deferred: hasDraft, onChange }
}

export type ResolvedTableOptions<TRow extends object> = ReturnType<typeof createTableOptions<TRow>>
