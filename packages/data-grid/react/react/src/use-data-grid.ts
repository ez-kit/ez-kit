import { createTable } from '@ez-kit/data-grid-core'
import { useRef } from 'react'

import { createDataGridInstance } from './data-grid-instance'
import { mergeGridOptionLayers, useDataGridOptions } from './data-grid-options-context'
import { DATA_GRID_DEFAULTS, DEFAULT_FILTER_DEBOUNCE_MS } from './defaults'

import type { CellTypeRegistry } from './cell-types-context'
import type { DataGridInstance } from './data-grid-instance'
import type { DataGridDefaultOptions } from './data-grid-options-context'
import type {
	ConfirmationOptions,
	ExpandingConfig,
	FilteringConfig,
	GlobalFilteringConfig,
	LoadMoreDirection,
	PaginationConfig,
	RowVirtualOptions,
	SelectionConfig,
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

/** Symbol used to carry the selection panel config on the table instance for SelectionBar to read. Internal — not part of the public API. */
export const SELECTION_PANEL_KEY = Symbol('selectionPanel')

/** Symbol used to carry columnVisibility UI config on the table instance for Toolbar to read. */
export const COLUMN_VISIBILITY_KEY = Symbol('columnVisibility')

/** Symbol used to carry sorting UI config on the table instance for Toolbar to read. */
export const SORTING_KEY = Symbol('sorting')

/** Symbol used to carry filtering variant on the table instance for Header to read. */
export const FILTERING_VARIANT_KEY = Symbol('filteringVariant')

/** Symbol used to carry the column filter commit debounce (ms) on the table instance for Header / FilterPanel to read. */
export const FILTERING_DEBOUNCE_KEY = Symbol('filteringDebounce')

// Re-exported from the shared defaults module so the public API surface is unchanged.
export { DEFAULT_FILTER_DEBOUNCE_MS } from './defaults'

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

/** Symbol used to carry normalized infinite-scroll config on the table instance for the infinite hook to read. */
export const INFINITE_KEY = Symbol('infinite')

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

export type SelectionPanelCallbackArgs<TRow extends object = object> = {
	table: Table<TRow>
	clearSelection: () => void
	selectedRows: Row<TRow>[]
}

export type SelectionPanelVariant = 'floating' | 'inline'

/** Named render modes for the selection panel — avoids scattering the raw literals. Internal. */
export const SELECTION_PANEL_VARIANT = {
	Floating: 'floating',
	Inline: 'inline',
} as const satisfies Record<string, SelectionPanelVariant>

/** Render mode used when a panel config omits `variant`. Internal. */
export const DEFAULT_SELECTION_PANEL_VARIANT: SelectionPanelVariant = SELECTION_PANEL_VARIANT.Floating

export type SelectionPanelConfig<TRow extends object = object> = {
	/**
	 * Render mode.
	 * - `'floating'` (default) — rendered as a positioned/sticky bar, typically overlaying the table area.
	 * - `'inline'` — rendered as a normal block in the document flow, above the Toolbar.
	 */
	variant?: SelectionPanelVariant
	/** If provided — Delete button appears in the panel. */
	onDelete?: (args: SelectionPanelCallbackArgs<TRow>) => void
	/**
	 * Prompt before running `onDelete`. When set, clicking Delete opens the shared
	 * `ConfirmDialog` slot with count-aware text; `onDelete` runs only on confirm.
	 * Omit (or `false`) for the default instant behaviour. Reuses the core
	 * {@link ConfirmationOptions} shape from the per-row `deleting` feature.
	 */
	confirmation?: boolean | ConfirmationOptions
	/**
	 * Replaces default clear behaviour.
	 * `clearSelection` arg is the default reset — call it if needed.
	 */
	onClear?: (args: SelectionPanelCallbackArgs<TRow>) => void
	/** Rendered between Delete and Cancel. ReactElement or render-function. */
	actions?: ReactElement | ((args: SelectionPanelCallbackArgs<TRow>) => ReactElement)
}

/**
 * React-layer selection config. Extends the headless core {@link SelectionConfig}
 * (`onChange`, `multiple`) with the React-only `panel` — a selection info bar that is
 * inherently React (its `actions` are `ReactElement`s), so it lives only in this layer
 * and is never passed down to the core `selection` config.
 */
export type ReactSelectionConfig<TRow extends object = object> = SelectionConfig & {
	/**
	 * Selection info panel config.
	 * - `false` — panel never shown
	 * - `undefined` | `true` — panel shown when ≥1 row selected (no delete button)
	 * - {@link SelectionPanelConfig} — panel shown with config
	 */
	panel?: boolean | SelectionPanelConfig<TRow>
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

/**
 * React-layer pagination config. Adds infinite-scroll **detection tuning**
 * (`trigger`, `threshold`) on top of the headless {@link PaginationConfig}
 * (`mode`, `hasNextPage`, `onLoadMore`). Mirrors the `ReactFilteringConfig`
 * pattern: data semantics in core, DOM detection here.
 */
export type ReactPaginationConfig = PaginationConfig & {
	/**
	 * Infinite mode only. `'auto'` (default) loads when the edge enters view;
	 * `'manual'` suppresses auto detection and renders a "Load more" control.
	 */
	trigger?: 'auto' | 'manual'
	/**
	 * Infinite mode only. How close to the edge triggers a load.
	 * `{ rows }` (default 5) drives the virtualized index path; `{ px }` (default 200)
	 * is the IntersectionObserver `rootMargin` for the non-virtualized path.
	 */
	threshold?: { rows?: number } | { px?: number }
}

/**
 * Normalized infinite-scroll config stored on the table instance for the hook to read.
 * Carries the user-owned `hasNextPage` descriptor (read reactively each render) alongside
 * detection tuning — `state.infinite` stays 100% grid-owned.
 */
export type NormalizedInfiniteConfig = {
	trigger: 'auto' | 'manual'
	threshold: { rows?: number; px?: number }
	hasNextPage: boolean
	hasPreviousPage: boolean
	onLoadMore?: (ctx: { direction: LoadMoreDirection }) => Promise<void> | void
}

function normalizeInfinite(
	pagination: boolean | ReactPaginationConfig | undefined,
): NormalizedInfiniteConfig | undefined {
	if (typeof pagination !== 'object' || pagination.mode !== 'infinite') return undefined
	const threshold = pagination.threshold ?? { rows: DATA_GRID_DEFAULTS.infinite.threshold.rows }
	return {
		trigger: pagination.trigger ?? DATA_GRID_DEFAULTS.infinite.trigger,
		threshold,
		hasNextPage: pagination.hasNextPage ?? false,
		hasPreviousPage: pagination.hasPreviousPage ?? false,
		...(pagination.onLoadMore !== undefined ? { onLoadMore: pagination.onLoadMore } : {}),
	}
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
	 * Commit debounce in milliseconds for column text filter inputs.
	 * `0` (default) commits on every keystroke — behaviour unchanged.
	 * Discrete controls (between, multi-select, select/badge, custom components)
	 * always commit instantly and are unaffected by this option.
	 */
	debounce?: number
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
	 * Enable row selection.
	 * - `false` / omitted — disabled
	 * - `true` — enabled (multi-select) with no info panel
	 * - {@link ReactSelectionConfig} — headless options (`onChange`, `multiple`) plus the
	 *   React-only `panel` (selection info bar). `panel` renders only when selection is enabled.
	 */
	selection?: boolean | ReactSelectionConfig<TRow>
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
	/**
	 * Pagination config. Page-based by default; set `mode: 'infinite'` for infinite
	 * scroll. The React layer adds `trigger` / `threshold` detection tuning on top of
	 * the headless {@link PaginationConfig}.
	 */
	pagination?: boolean | ReactPaginationConfig
} & Omit<
		TableConfig<TRow>,
		'filtering' | 'globalFiltering' | 'expanding' | 'columnVisibility' | 'pagination' | 'selection'
	> & {
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
 * Default options contributed by an ancestor {@link DataGridOptionsProvider} and by the
 * kit factory's `defaultOptions` are merged **under** the passed `config` (instance wins),
 * with a per-feature deep merge. Precedence, low → high:
 * factory `defaultOptions` < provider `defaults` < instance `config`.
 *
 * @param instanceConfig Per-call grid config; the highest-priority option layer.
 * @param factoryDefaults Base defaults bound by `createDataGrid({ defaultOptions })`.
 *   Internal — supplied by the kit factory, not by application call sites.
 *
 * @example
 * const instance = useDataGrid({ data: users, columns, sorting: true })
 * return <DataGrid table={instance} />
 */
export function useDataGrid<TRow extends object>(
	instanceConfig: UseDataGridConfig<TRow>,
	factoryDefaults?: DataGridDefaultOptions<TRow>,
): DataGridInstance<TRow> {
	const providerDefaults = useDataGridOptions<TRow>()
	const config = mergeGridOptionLayers(factoryDefaults, providerDefaults, instanceConfig)
	const {
		cellTypes,
		pageSizer,
		selection: rawSelection,
		columnVisibility,
		fallbacks,
		filtering: rawFiltering,
		globalFiltering: rawGlobalFiltering,
		expanding: rawExpanding,
		pagination: rawPagination,
		state,
		onStateChange,
		stickyHeader,
		...restConfig
	} = config

	// Split `selection` into the headless core part (`onChange` / `multiple`) passed to
	// createTable and the React-only `panel` stored on the instance for SelectionBar to read.
	// `panel` is stripped so the core `selection` config never carries React-specific fields.
	const selectionPanel: boolean | SelectionPanelConfig<TRow> | undefined =
		typeof rawSelection === 'object' ? rawSelection.panel : undefined
	const coreSelection: boolean | SelectionConfig | undefined =
		typeof rawSelection === 'object'
			? (({ panel: _panel, ...rest }) => rest)(rawSelection)
			: rawSelection

	// Split pagination into the headless core part (strip React-only detection tuning)
	// and the normalized infinite config stored on the instance for the infinite hook.
	const corePagination: boolean | PaginationConfig | undefined =
		typeof rawPagination === 'object'
			? (({ trigger: _trigger, threshold: _threshold, ...rest }) => rest)(rawPagination)
			: rawPagination
	const normalizedInfinite = normalizeInfinite(rawPagination)

	// Build core-compatible expanding config (strip React-only fields)
	const reactExpandingCfg = typeof rawExpanding === 'object' ? rawExpanding : undefined
	const coreGetRowCanExpand =
		reactExpandingCfg?.getRowCanExpand ?? (reactExpandingCfg?.renderExpanded !== undefined ? () => true : undefined)
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

	const filteringDebounce: number =
		typeof rawFiltering === 'object' ? (rawFiltering.debounce ?? DEFAULT_FILTER_DEBOUNCE_MS) : DEFAULT_FILTER_DEBOUNCE_MS

	const normalizedChips: NormalizedFilterChipsConfig | undefined = (() => {
		if (typeof rawFiltering !== 'object' || rawFiltering.chips === undefined || rawFiltering.chips === false) {
			return undefined
		}
		if (rawFiltering.chips === true) return { position: DATA_GRID_DEFAULTS.filtering.chips.position }
		return { position: rawFiltering.chips.position ?? DATA_GRID_DEFAULTS.filtering.chips.position }
	})()

	const normalizedClearButton: NormalizedClearButtonConfig | undefined = (() => {
		if (
			typeof rawFiltering !== 'object' ||
			rawFiltering.clearButton === undefined ||
			rawFiltering.clearButton === false
		) {
			return undefined
		}
		if (rawFiltering.clearButton === true) return { alwaysShow: DATA_GRID_DEFAULTS.filtering.clearButton.alwaysShow }
		return { alwaysShow: Boolean(rawFiltering.clearButton.alwaysShow) }
	})()

	const coreFiltering: boolean | FilteringConfig | undefined =
		typeof rawFiltering === 'object'
			? (({ variant: _v, chips: _c, clearButton: _cb, debounce: _d, ...rest }) => rest)(rawFiltering)
			: rawFiltering

	// Split `globalFiltering` into:
	// - core part (fn, fns) — passed through to createTable
	// - UI part (placeholder, debounce, toolbar) — stored on the table instance
	//   via GLOBAL_FILTERING_KEY so Toolbar / GlobalFilterInput can read it
	const normalizedGlobalFiltering: NormalizedGlobalFilteringConfig | undefined = (() => {
		if (!rawGlobalFiltering) return undefined
		if (rawGlobalFiltering === true) {
			return {
				placeholder: DATA_GRID_DEFAULTS.globalFiltering.placeholder,
				debounce: DATA_GRID_DEFAULTS.globalFiltering.debounce,
				toolbar: true,
			}
		}
		return {
			placeholder: rawGlobalFiltering.placeholder ?? DATA_GRID_DEFAULTS.globalFiltering.placeholder,
			debounce: rawGlobalFiltering.debounce ?? DATA_GRID_DEFAULTS.globalFiltering.debounce,
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
			pagination: corePagination,
			selection: coreSelection,
			// Pass columnVisibility presence to core so it can table-level-gate enableHiding.
			// Core treats truthy as ON, falsy as OFF — the React UI config (toolbar etc.)
			// is layered separately via the COLUMN_VISIBILITY_KEY symbol.
			columnVisibility,
			onStateChange: (updater) => onStateChangeRef.current?.(updater),
		} as TableConfig<TRow>),
	)
	const table = instanceRef.current.table
	const tableAsSymbolMap = table as unknown as Record<symbol, unknown>

	// Sync controlled state on every render — external state portions override internal state.
	//
	// We must push the update into BOTH TanStack's `options.state` AND the external
	// snapshot store the React layer subscribes to (`useDataGridStore`), otherwise
	// components like Body never see the change. `syncControlledState` does both in
	// one shot and skips `onStateChange` — the prop is the source of truth, so firing
	// the callback would loop back through a consumer that mirrors it into React state.
	//
	// Skip the call when every supplied slice is referentially equal to the current
	// snapshot — avoids redundant `store.setState` notifications on every render.
	if (state !== undefined) {
		const snapshot = instanceRef.current.table.getSnapshot()
		const hasChanges = (Object.keys(state) as (keyof TableState)[]).some((key) => snapshot[key] !== state[key])
		if (hasChanges) {
			instanceRef.current.table.syncControlledState(state)
		}
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

	// Store the selection panel config on the table instance so SelectionBar can read without an extra prop
	const selectionPanelRef = useRef(selectionPanel)
	selectionPanelRef.current = selectionPanel
	tableAsSymbolMap[SELECTION_PANEL_KEY] = selectionPanelRef.current

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

	// Store the column filter commit debounce on the table instance so Header / FilterPanel can read it
	tableAsSymbolMap[FILTERING_DEBOUNCE_KEY] = filteringDebounce

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

	// Store normalized infinite-scroll config (trigger, threshold, latest onLoadMore) so
	// useInfiniteScroll can read it without prop drilling. Reassigned every render so the
	// hook always invokes the freshest onLoadMore closure.
	tableAsSymbolMap[INFINITE_KEY] = normalizedInfinite

	// Store renderExpanded on the table instance so Body/ExpandedRow can read without an extra prop
	const expandRef = useRef(rawExpanding)
	expandRef.current = rawExpanding
	tableAsSymbolMap[EXPAND_KEY] = {
		renderExpanded: typeof expandRef.current === 'object' ? expandRef.current.renderExpanded : undefined,
	}

	// NOTE: useDataGrid no longer calls useSyncExternalStore. Components that
	// need to re-render on state changes subscribe themselves via
	// `useDataGridStore` (selective) or `useTable()` (broad, back-compat).

	// Sync data synchronously during render — symmetrically with the other
	// option-sync blocks above. Doing this in `useEffect` would update
	// `options.data` AFTER child components (Body / Cell) had already
	// rendered with the previous data, leaving the UI one step behind until
	// another unrelated state change forced a re-render.
	const dataRef = useRef(config.data)
	if (config.data !== dataRef.current) {
		dataRef.current = config.data
		instanceRef.current.table.setOptions((prev) => ({ ...prev, data: config.data }))
	}

	// Re-sync the manual-pagination server-data descriptors (`rowCount` / `pageCount`)
	// on every render, mirroring the create-time logic in `createTable`. These are
	// options, not state, so the `state` sync block above never touches them — yet a
	// server total is inherently reactive (e.g. it starts at 0, then reflects the
	// filtered total after each fetch). Without this projection the grid would freeze
	// `pageCount` / "X of N" at the value present on first mount. Prefer `rowCount`
	// (let TanStack derive `pageCount`); otherwise fall back to `pageCount ?? -1`.
	const manualPagination = typeof corePagination === 'object' && corePagination.manual === true
	const nextRowCount = manualPagination ? corePagination.rowCount : undefined
	const nextPageCount = manualPagination
		? nextRowCount !== undefined
			? undefined
			: (corePagination.pageCount ?? -1)
		: undefined
	const paginationDescriptorRef = useRef({ rowCount: nextRowCount, pageCount: nextPageCount })
	if (
		paginationDescriptorRef.current.rowCount !== nextRowCount ||
		paginationDescriptorRef.current.pageCount !== nextPageCount
	) {
		paginationDescriptorRef.current = { rowCount: nextRowCount, pageCount: nextPageCount }
		instanceRef.current.table.setOptions((prev) => {
			// Assign only the defined descriptor and drop the other (both are optional
			// options) — `exactOptionalPropertyTypes` forbids assigning `undefined`.
			const next = { ...prev }
			if (nextRowCount !== undefined) next.rowCount = nextRowCount
			else delete next.rowCount
			if (nextPageCount !== undefined) next.pageCount = nextPageCount
			else delete next.pageCount
			return next
		})
	}

	// The loading status (`isPending`/`isFetching`/`isError`/`error`) is user-owned
	// controlled state fed through the `state.loading` slice; it is handled by the
	// generic `state` sync block above and the grid never writes it. hasNextPage is a
	// pagination option read reactively from INFINITE_KEY by useInfiniteScroll. Neither
	// needs a bespoke projection here.

	return instanceRef.current
}
