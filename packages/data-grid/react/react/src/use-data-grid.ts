import { createTable } from '@ez-kit/data-grid-core'
import { useEffect, useRef } from 'react'

import { createDataGridInstance } from './data-grid-instance'

import type { CellTypeRegistry } from './cell-types-context'
import type { DataGridInstance } from './data-grid-instance'
import type {
	ExpandingConfig,
	FilteringConfig,
	GlobalFilteringConfig,
	RowVirtualOptions,
	TableConfig,
	VirtualizedConfig,
} from '@ez-kit/data-grid-core'
import type { Row, Table, TableState } from '@tanstack/table-core'
import type { ComponentType, ReactElement } from 'react'

/** Symbol used to carry cellTypes on the table instance for DataGrid to read. */
export const CELL_TYPES_KEY = Symbol('cellTypes')

/** Symbol used to carry pageSizer config on the table instance for PageSizer to read. */
export const PAGE_SIZER_KEY = Symbol('pageSizer')

/** Symbol used to carry rowPinning config on the table instance for RowPinCell to read. */
export const ROW_PINNING_KEY = Symbol('rowPinning')

/** Symbol used to carry colPinning enabled flag on the table instance for Header to read. */
export const COL_PINNING_KEY = Symbol('colPinning')

/** Symbol used to carry normalized virtualized config on the table instance for Body/Table to read. */
export const VIRTUALIZED_KEY = Symbol('virtualized')

/** Symbol used to carry selectionBar config on the table instance for SelectionBar to read. */
export const SELECTION_BAR_KEY = Symbol('selectionBar')

/** Symbol used to carry columnVisibility UI config on the table instance for Toolbar to read. */
export const COLUMN_VISIBILITY_KEY = Symbol('columnVisibility')

/** Symbol used to carry sorting UI config on the table instance for Toolbar to read. */
export const SORTING_KEY = Symbol('sorting')

/** Symbol used to carry filtering variant on the table instance for Header to read. */
export const FILTERING_VARIANT_KEY = Symbol('filteringVariant')

/** Symbol used to carry normalized globalFiltering UI config on the table instance for Toolbar / GlobalFilterInput to read. */
export const GLOBAL_FILTERING_KEY = Symbol('globalFiltering')

/** Symbol used to carry normalized active filter chips config on the table instance. */
export const FILTER_CHIPS_KEY = Symbol('filterChips')

/** Symbol used to carry normalized Clear-all filters button config on the table instance. */
export const FILTER_CLEAR_BUTTON_KEY = Symbol('filterClearButton')

/** Symbol used to carry fallbacks config on the table instance for Body to read. */
export const FALLBACKS_KEY = Symbol('fallbacks')

/** Symbol used to carry stickyHeader flag on the table instance for DataGridTable to read. */
export const STICKY_HEADER_KEY = Symbol('stickyHeader')

/** Symbol used to carry expanding config on the table instance for Body/ExpandedRow to read. */
export const EXPAND_KEY = Symbol('expanding')

export type ExpandedRowProps<TRow extends object> = {
	row: Row<TRow>
	table: Table<TRow>
}

export type ReactExpandingConfig<TRow extends object> = {
	/** Mode switch. Default: 'sub-content'. */
	variant?: 'sub-content' | 'tree'
	/** Sub-content: component rendered in a full-width row below expanded rows. */
	renderExpanded?: ComponentType<ExpandedRowProps<TRow>>
	/**
	 * Sub-content: controls per-row expandability.
	 * When omitted and renderExpanded is provided, all rows are expandable.
	 */
	getRowCanExpand?: (row: Row<TRow>) => boolean
	/** Tree: sub-row extractor. Auto-detects row.children when omitted. */
	getSubRows?: (row: TRow, index: number) => TRow[] | undefined
}

export type SelectionBarCallbackArgs<TRow extends object = object> = {
	table: Table<TRow>
	clearSelection: () => void
	selectedRows: Row<TRow>[]
}

export type SelectionBarVariant = 'floating' | 'inline'

export type SelectionBarConfig<TRow extends object = object> = {
	/**
	 * Render mode.
	 * - `'floating'` (default) — rendered as a positioned/sticky bar, typically overlaying the table area.
	 * - `'inline'` — rendered as a normal block in the document flow, above the Toolbar.
	 */
	variant?: SelectionBarVariant
	/** If provided — Delete button appears in the bar. */
	onDelete?: (args: SelectionBarCallbackArgs<TRow>) => void
	/**
	 * Replaces default clear behaviour.
	 * `clearSelection` arg is the default reset — call it if needed.
	 */
	onClear?: (args: SelectionBarCallbackArgs<TRow>) => void
	/** Rendered between Delete and Cancel. ReactElement or render-function. */
	actions?: ReactElement | ((args: SelectionBarCallbackArgs<TRow>) => ReactElement)
}

/** Normalized virtualized config stored on the table instance. */
export type NormalizedVirtualizedConfig = {
	row: RowVirtualOptions
}

function normalizeVirtualized(
	virtualized: boolean | VirtualizedConfig | undefined,
): NormalizedVirtualizedConfig | undefined {
	if (!virtualized) return undefined
	if (virtualized === true) return { row: {} }
	const row = virtualized.row
	if (!row) return undefined
	if (row === true) return { row: {} }
	return { row }
}

export type PageSizerConfig = {
	items: number[]
}

export type ColumnVisibilityUIConfig = {
	/** Show a column visibility toggle button in the toolbar. Default: false. */
	toolbar?: boolean
}

export type LoadingFallbackConfig = {
	/** Override loading content. ReactElement rendered as-is; ComponentType called via flexRender. */
	content?: ReactElement | ComponentType
}

export type EmptyFallbackConfig = {
	/** Override empty content. ReactElement rendered as-is; ComponentType called via flexRender. */
	content?: ReactElement | ComponentType
}

export type NoResultsFallbackConfig = {
	/** Override no-results content. ReactElement rendered as-is; ComponentType called via flexRender. */
	content?: ReactElement | ComponentType
}

export type FallbacksConfig = {
	/**
	 * Skeleton rows shown while `loading: true`.
	 * - `true` / omitted — use DI `LoadingRow` component (default)
	 * - `false` — disable
	 * - `LoadingFallbackConfig` — custom content override
	 */
	loading?: LoadingFallbackConfig | boolean
	/**
	 * Shown when `data` is empty and not loading.
	 * - `true` / omitted — use DI `EmptyState` component (default)
	 * - `false` — disable
	 * - `EmptyFallbackConfig` — custom content override
	 */
	empty?: EmptyFallbackConfig | boolean
	/**
	 * Shown when filters produce 0 rows but raw data is non-empty.
	 * - `true` / omitted — use DI `NoResultsState` component (default)
	 * - `false` — disable
	 * - `NoResultsFallbackConfig` — custom content override
	 */
	noResults?: NoResultsFallbackConfig | boolean
}

export type FilteringVariant = 'inline' | 'popover' | 'panel'

export type FilterChipsPosition = 'above' | 'below'

export type FilterChipsConfig = {
	/** Where to render the auto-mounted chips strip relative to the table. Default: 'above'. */
	position?: FilterChipsPosition
}

export type FilterClearButtonConfig = {
	/** When true the Clear-all button is rendered (disabled) even with no active filters. Default: false. */
	alwaysShow?: boolean
}

export type ReactFilteringConfig = {
	/** Display variant for column filter controls. Default: 'inline'. */
	variant?: FilteringVariant
	/**
	 * Auto-mount a strip of removable chips for active filters.
	 * - `false` / omitted — no auto-mount. `<DataGrid.ActiveFiltersBar />` still works manually.
	 * - `true` — auto-mount with `position: 'above'`.
	 * - `FilterChipsConfig` — fine-grained.
	 */
	chips?: boolean | FilterChipsConfig
	/**
	 * Auto-mount a Clear-all button into `Toolbar.right` after `GlobalFilterInput`.
	 * Hidden when no active filter unless `alwaysShow: true`.
	 * - `false` / omitted — no auto-mount. `<DataGrid.ClearFiltersButton />` still works manually.
	 * - `true` — auto-mount with default behaviour.
	 * - `FilterClearButtonConfig` — fine-grained.
	 */
	clearButton?: boolean | FilterClearButtonConfig
} & FilteringConfig

/** Normalized shape stored on the table instance for `DataGrid` root to read. */
export type NormalizedFilterChipsConfig = {
	position: FilterChipsPosition
}

/** Normalized shape stored on the table instance for `Toolbar` / `ClearFiltersButton` to read. */
export type NormalizedClearButtonConfig = {
	alwaysShow: boolean
}

/**
 * React-layer config for global search.
 *
 * Adds UI-facing fields (`placeholder`, `debounce`, `toolbar`) on top of the
 * headless {@link GlobalFilteringConfig}.
 */
export type ReactGlobalFilteringConfig = {
	/** Placeholder for the search input. Default: 'Search…'. */
	placeholder?: string
	/**
	 * Commit debounce in milliseconds for the auto-mounted input.
	 * `0` disables debouncing. Default: 250.
	 */
	debounce?: number
	/**
	 * Auto-mount control for the search input in the Toolbar.
	 * - `true` / omitted — input is auto-mounted in `Toolbar.right`
	 * - `false` — no auto-mount; place `<DataGrid.GlobalFilterInput />` yourself
	 */
	toolbar?: boolean
} & GlobalFilteringConfig

/** Normalized shape stored on the table instance for child components to read. */
export type NormalizedGlobalFilteringConfig = {
	placeholder: string
	debounce: number
	toolbar: boolean
}

export type UseDataGridConfig<TRow extends object> = {
	/**
	 * Fallback states shown when the grid has no visible rows.
	 * All three states are enabled by default when the corresponding DI component is registered.
	 * Pass `false` to a specific state to disable it, or provide a config object for custom content.
	 */
	fallbacks?: FallbacksConfig
	/**
	 * Enable filtering.
	 * - `true` — inline filter inputs below each column header
	 * - `{ variant: 'popover' }` — filter icon in header; click opens a popover with the filter input
	 * - `{ variant: 'inline', ...opts }` — same as `true` with extra FilteringConfig options
	 */
	filtering?: boolean | ReactFilteringConfig
	/**
	 * Enable cross-column global search.
	 * - `true` — auto-mounts a search input in Toolbar.right with defaults
	 *   (`placeholder: 'Search…'`, `debounce: 250`, `includesString` match)
	 * - {@link ReactGlobalFilteringConfig} — fine-grained control over placeholder,
	 *   debounce, filter function, registry, and auto-mount
	 */
	globalFiltering?: boolean | ReactGlobalFilteringConfig
	/** Custom cell type renderers. Merged with types passed directly to `DataGrid`. */
	cellTypes?: CellTypeRegistry
	/** Page size selector config. When provided, renders a PageSizer control. */
	pageSizer?: PageSizerConfig
	/**
	 * Selection info bar config.
	 * - `false` — bar never shown
	 * - `undefined` | `true` — bar shown when ≥1 row selected (no delete button)
	 * - `SelectionBarConfig` — bar shown with config
	 *
	 * Requires `selection: true` to have any effect.
	 */
	selectionBar?: boolean | SelectionBarConfig<TRow>
	/**
	 * Column visibility UI config.
	 * - `true` — enables column visibility (toolbar button shown)
	 * - `{ toolbar: true }` — shows toggle button in toolbar
	 */
	columnVisibility?: boolean | ColumnVisibilityUIConfig
	/**
	 * Controlled table state. Pass a partial `TableState` to control specific portions
	 * (e.g. only sorting) while leaving the rest internally managed.
	 * Must be used together with `onStateChange` to reflect state updates back.
	 */
	state?: Partial<TableState>
	/**
	 * Make the table header stick to the top when the table scrolls vertically.
	 * The scroll container height defaults to `400px`; override via the
	 * `--dg-table-max-height` CSS variable on a parent element.
	 */
	stickyHeader?: boolean
} & Omit<TableConfig<TRow>, 'filtering' | 'globalFiltering' | 'expanding' | 'columnVisibility'> & {
	expanding?: boolean | ReactExpandingConfig<TRow>
}

/**
 * React hook that constructs a {@link DataGridInstance} once and returns it on
 * every render. The instance is stable across renders — the underlying table
 * is created exactly once.
 *
 * `useDataGrid` itself does NOT subscribe to state changes. Components that
 * need to re-render on table state updates should call `useDataGridStore`
 * (or `useTable()`, which subscribes broadly for back-compat).
 *
 * @example
 * const instance = useDataGrid({ data: users, columns, sorting: true })
 * return <DataGrid table={instance} />
 */
export function useDataGrid<TRow extends object>(config: UseDataGridConfig<TRow>): DataGridInstance<TRow> {
	const {
		cellTypes,
		pageSizer,
		selectionBar,
		columnVisibility,
		fallbacks,
		filtering: rawFiltering,
		globalFiltering: rawGlobalFiltering,
		expanding: rawExpanding,
		state,
		onStateChange,
		stickyHeader,
		...restConfig
	} = config

	// Build core-compatible expanding config (strip React-only fields)
	const reactExpandingCfg = typeof rawExpanding === 'object' ? rawExpanding : undefined
	const coreGetRowCanExpand =
		reactExpandingCfg?.getRowCanExpand ??
		(reactExpandingCfg?.renderExpanded !== undefined ? () => true : undefined)
	const coreExpanding: boolean | ExpandingConfig | undefined =
		rawExpanding === undefined
			? undefined
			: typeof rawExpanding === 'boolean'
				? rawExpanding
				: ({
						...(rawExpanding.variant !== undefined ? { variant: rawExpanding.variant } : {}),
						...(rawExpanding.getSubRows !== undefined
							? { getSubRows: rawExpanding.getSubRows as ExpandingConfig['getSubRows'] }
							: {}),
						...(coreGetRowCanExpand !== undefined ? { getRowCanExpand: coreGetRowCanExpand } : {}),
					} as ExpandingConfig)

	const filteringVariant: FilteringVariant | undefined =
		typeof rawFiltering === 'object' ? rawFiltering.variant : undefined

	const normalizedChips: NormalizedFilterChipsConfig | undefined = (() => {
		if (typeof rawFiltering !== 'object' || rawFiltering.chips === undefined || rawFiltering.chips === false) {
			return undefined
		}
		if (rawFiltering.chips === true) return { position: 'above' }
		return { position: rawFiltering.chips.position ?? 'above' }
	})()

	const normalizedClearButton: NormalizedClearButtonConfig | undefined = (() => {
		if (
			typeof rawFiltering !== 'object' ||
			rawFiltering.clearButton === undefined ||
			rawFiltering.clearButton === false
		) {
			return undefined
		}
		if (rawFiltering.clearButton === true) return { alwaysShow: false }
		return { alwaysShow: Boolean(rawFiltering.clearButton.alwaysShow) }
	})()

	const coreFiltering: boolean | FilteringConfig | undefined =
		typeof rawFiltering === 'object'
			? (({ variant: _v, chips: _c, clearButton: _cb, ...rest }) => rest)(rawFiltering)
			: rawFiltering

	// Split `globalFiltering` into:
	// - core part (fn, fns) — passed through to createTable
	// - UI part (placeholder, debounce, toolbar) — stored on the table instance
	//   via GLOBAL_FILTERING_KEY so Toolbar / GlobalFilterInput can read it
	const normalizedGlobalFiltering: NormalizedGlobalFilteringConfig | undefined = (() => {
		if (!rawGlobalFiltering) return undefined
		if (rawGlobalFiltering === true) {
			return { placeholder: 'Search…', debounce: 250, toolbar: true }
		}
		return {
			placeholder: rawGlobalFiltering.placeholder ?? 'Search…',
			debounce: rawGlobalFiltering.debounce ?? 250,
			toolbar: rawGlobalFiltering.toolbar !== false,
		}
	})()

	const coreGlobalFiltering: boolean | GlobalFilteringConfig | undefined = (() => {
		if (rawGlobalFiltering === undefined || rawGlobalFiltering === false) return rawGlobalFiltering
		if (rawGlobalFiltering === true) return true
		const fn = rawGlobalFiltering.fn
		const fns = rawGlobalFiltering.fns
		if (fn === undefined && fns === undefined) return true
		const cfg: GlobalFilteringConfig = {}
		if (fn !== undefined) cfg.fn = fn
		if (fns !== undefined) cfg.fns = fns
		return cfg
	})()

	// Stable ref so the table closure always calls the latest onStateChange without re-creating the table
	const onStateChangeRef = useRef(onStateChange)
	onStateChangeRef.current = onStateChange

	const instanceRef = useRef<DataGridInstance<TRow> | null>(null)
	instanceRef.current ??= createDataGridInstance(
		createTable({
			...restConfig,
			filtering: coreFiltering,
			globalFiltering: coreGlobalFiltering,
			expanding: coreExpanding,
			// Pass columnVisibility presence to core so it can table-level-gate enableHiding.
			// Core treats truthy as ON, falsy as OFF — the React UI config (toolbar etc.)
			// is layered separately via the COLUMN_VISIBILITY_KEY symbol.
			columnVisibility,
			onStateChange: (updater) => onStateChangeRef.current?.(updater),
		} as TableConfig<TRow>),
	)
	const table = instanceRef.current.table
	const tableAsSymbolMap = table as unknown as Record<symbol, unknown>

	// Sync controlled state on every render — external state portions override internal state
	if (state !== undefined) {
		table.setOptions((prev) => ({
			...prev,
			state: { ...prev.state, ...state },
		}))
	}

	// Re-sync feature configs every render so callbacks (e.g. creating.onSave)
	// see the latest captured props/state instead of the closure from first mount.
	table.setOptions((prev) => ({
		...prev,
		...(config.creating !== undefined ? { creating: config.creating } : {}),
		...(config.editing !== undefined ? { editing: config.editing } : {}),
		...(config.deleting !== undefined ? { deleting: config.deleting } : {}),
	}))

	// Store cellTypes on the table instance so DataGrid can read without an extra prop
	const cellTypesRef = useRef(cellTypes)
	cellTypesRef.current = cellTypes
	tableAsSymbolMap[CELL_TYPES_KEY] = cellTypesRef.current

	// Store pageSizer config on the table instance so PageSizer can read without an extra prop
	const pageSizerRef = useRef(pageSizer)
	pageSizerRef.current = pageSizer
	tableAsSymbolMap[PAGE_SIZER_KEY] = pageSizerRef.current

	// Store rowPinning config on the table instance so RowPinCell can read without an extra prop
	const rowPinningRef = useRef(config.pinning)
	rowPinningRef.current = config.pinning
	tableAsSymbolMap[ROW_PINNING_KEY] = rowPinningRef.current

	// Store colPinning enabled flag on the table instance so Header can read without an extra prop
	const colPinEnabled =
		config.pinning === true || (typeof config.pinning === 'object' && Boolean(config.pinning.column))
	tableAsSymbolMap[COL_PINNING_KEY] = colPinEnabled

	// Store selectionBar config on the table instance so SelectionBar can read without an extra prop
	const selectionBarRef = useRef(selectionBar)
	selectionBarRef.current = selectionBar
	tableAsSymbolMap[SELECTION_BAR_KEY] = selectionBarRef.current

	// Store columnVisibility UI config on the table instance so Toolbar can read without an extra prop
	const colVisibilityRef = useRef(columnVisibility)
	colVisibilityRef.current = columnVisibility
	tableAsSymbolMap[COLUMN_VISIBILITY_KEY] = colVisibilityRef.current

	// Store sorting config on the table instance so Toolbar can read without an extra prop
	const sortingRef = useRef(config.sorting)
	sortingRef.current = config.sorting
	tableAsSymbolMap[SORTING_KEY] = sortingRef.current

	// Store filteringVariant on the table instance so Header can read without an extra prop
	tableAsSymbolMap[FILTERING_VARIANT_KEY] = filteringVariant

	// Store normalized globalFiltering UI config (placeholder, debounce, toolbar) on the
	// table instance so Toolbar / GlobalFilterInput can read it without prop drilling.
	tableAsSymbolMap[GLOBAL_FILTERING_KEY] = normalizedGlobalFiltering

	// Store normalized filter chips/clear-button UI configs so DataGrid root and Toolbar
	// can decide whether to auto-mount the corresponding compound components.
	tableAsSymbolMap[FILTER_CHIPS_KEY] = normalizedChips
	tableAsSymbolMap[FILTER_CLEAR_BUTTON_KEY] = normalizedClearButton

	// Store fallbacks config on the table instance so Body can read without an extra prop
	const fallbacksRef = useRef(fallbacks)
	fallbacksRef.current = fallbacks
	tableAsSymbolMap[FALLBACKS_KEY] = fallbacksRef.current

	// Store normalized virtualized config on the table instance so DataGridTable/Body can read without an extra prop
	const virtualizedConfig = normalizeVirtualized(config.virtualized)
	tableAsSymbolMap[VIRTUALIZED_KEY] = virtualizedConfig

	// Store stickyHeader flag on the table instance so DataGridTable can read without an extra prop
	tableAsSymbolMap[STICKY_HEADER_KEY] = stickyHeader ?? false

	// Store renderExpanded on the table instance so Body/ExpandedRow can read without an extra prop
	const expandRef = useRef(rawExpanding)
	expandRef.current = rawExpanding
	tableAsSymbolMap[EXPAND_KEY] = {
		renderExpanded: typeof expandRef.current === 'object' ? expandRef.current.renderExpanded : undefined,
	}

	// NOTE: useDataGrid no longer calls useSyncExternalStore. Components that
	// need to re-render on state changes subscribe themselves via
	// `useDataGridStore` (selective) or `useTable()` (broad, back-compat).

	// Sync data on change (every render, skipping if same reference)
	const dataRef = useRef(config.data)
	useEffect(() => {
		if (config.data !== dataRef.current) {
			dataRef.current = config.data
			instanceRef.current?.table.setData(config.data)
		}
	})

	// Sync loading on change
	useEffect(() => {
		if (config.loading !== undefined) {
			instanceRef.current?.table.setLoading(config.loading)
		}
	}, [config.loading])

	return instanceRef.current
}
