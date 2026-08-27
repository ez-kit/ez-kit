import { createTable, featureConfig, isFeatureEnabled, PaginationMode } from '@ez-kit/data-grid-core'
import { useEffect, useRef } from 'react'

import { mergeGridOptionLayers, useDataGridOptions } from './data-grid-options-context'
import { DATA_GRID_DEFAULTS, DEFAULT_FILTER_DEBOUNCE_MS } from './defaults'
import { prepareDataGridTable } from './prepare-table'
import { SelectionPanelVariant } from './types'
import { useSafeLayoutEffect } from './utils/use-safe-layout-effect'

import type { CellTypeRegistry } from './cell-types-context'
import type { DataGridDefaultOptions } from './data-grid-options-context'
import type { ResolvedGridOptions } from './resolved-options'
import type { FilterChipsPosition, FilteringVariant, LoadMoreTrigger, PaginationVariant } from './types'
import type {
	VisibilityConfig,
	ConfirmationOptions,
	CreatingConfig,
	DataTable,
	DeletingConfig,
	EditingConfig,
	ExpandingConfig,
	FeatureToggle,
	FilteringConfig,
	GlobalFilteringConfig,
	LoadMoreDirection,
	PaginationConfig,
	RowVirtualOptions,
	SelectionConfig,
	SortingConfig,
	TableConfig,
	VirtualizationConfig,
} from '@ez-kit/data-grid-core'
import type { Row, Table, TableState } from '@tanstack/table-core'
import type { ComponentType, HTMLAttributes, ReactElement } from 'react'

// Re-exported from the shared defaults module so the public API surface is unchanged.
export { DEFAULT_FILTER_DEBOUNCE_MS } from './defaults'

// The closed sets live in `./types` next to the other ones; re-exported here because this is
// where the options that carry them are declared — `SelectionPanelConfig`,
// `ReactPaginationConfig`, `ReactFilteringConfig`.
export { FilterChipsPosition, FilteringVariant, LoadMoreTrigger, SelectionPanelVariant } from './types'

export type ExpandedRowProps<TRow extends object> = {
	row: Row<TRow>
	table: Table<TRow>
}

/**
 * The headless {@link ExpandingConfig} with its one framework-bound field narrowed: in React
 * the detail panel is a component, not an opaque value. Nothing else is restated, so a field
 * added to the core config is available here the same day.
 */
export type ReactExpandingConfig<TRow extends object> = ExpandingConfig<TRow, ComponentType<ExpandedRowProps<TRow>>>

export type SelectionPanelCallbackArgs<TRow extends object = object> = {
	table: Table<TRow>
	clearSelection: () => void
	selectedRows: Row<TRow>[]
}

/** Render mode used when a panel config omits `variant`. Internal. */
export const DEFAULT_SELECTION_PANEL_VARIANT: SelectionPanelVariant = SelectionPanelVariant.Floating

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
 * (`onChange`, `multi`) with the React-only `panel` — a selection info bar that is
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
export type NormalizedVirtualizationConfig = {
	row: RowVirtualOptions
}

function normalizeVirtualization(
	virtualization: boolean | VirtualizationConfig | undefined,
): NormalizedVirtualizationConfig | undefined {
	if (!isFeatureEnabled(virtualization)) return undefined
	if (typeof virtualization !== 'object') return { row: {} }
	const row = virtualization.row
	if (!row) return undefined
	if (row === true) return { row: {} }
	return { row }
}

/**
 * React-layer pagination config. Adds infinite-scroll **detection tuning**
 * (`trigger`, `threshold`) on top of the headless {@link PaginationConfig}
 * (`mode`, `hasNextPage`, `onLoadMore`). Mirrors the `ReactFilteringConfig`
 * pattern: data semantics in core, DOM detection here.
 *
 * **Manual pagination — `pageIndex` clamping.** TanStack disables `autoResetPageIndex`
 * under `manual: true`, so a shrinking {@link PaginationConfig.rowCount} would otherwise
 * strand the user past the last page. When a supplied `rowCount` actually **shrinks**,
 * `useDataGrid` clamps `pageIndex` to the last valid page via `setPageIndex` — i.e. through
 * `onChange` / `onStateChange`, the normal controlled flow. An unknown total (`pageCount`
 * only) is never clamped: there is nothing to clamp to.
 *
 * Only a shrink clamps, never the first total observed: with the usual
 * `rowCount: data?.rowCount ?? 0`, the initial `0` means "not loaded yet", and clamping it
 * would reset a deep-linked page mid-fetch. The trade-off is that a deep link to an
 * already-out-of-range page is left as-is — the server returns no rows for it, so the
 * `0–0 of N` footer matches the empty screen rather than contradicting it.
 *
 * The clamp lands **after commit**, so the render in which `rowCount` shrinks still paints
 * the pre-clamp page for one frame before the corrected one. Notifying the consumer during
 * render would mean calling its state setter mid-render, which React rejects.
 *
 * Limitation: a consumer that fully controls `state.pagination` but **ignores** the change
 * callback keeps ownership of the index — the grid cannot force the shift, and the page
 * stays out of range until the consumer mirrors the callback.
 */
export type ReactPaginationConfig = PaginationConfig & {
	/**
	 * Page-based mode only. Which footer controls to render.
	 * Default {@link PaginationVariant.Numbered}. Purely presentational — paging
	 * behaviour is identical across variants.
	 */
	variant?: PaginationVariant
	/**
	 * `numbered` variant only. How many pages stay either side of the current one in the page-link
	 * strip. Default {@link DATA_GRID_DEFAULTS.pagination.siblings} (1) → `1 … 4 5 6 … 100`.
	 */
	siblings?: number
	/**
	 * `numbered` variant only. How many pages stay at each end of the page-link strip.
	 * Default {@link DATA_GRID_DEFAULTS.pagination.boundaries} (1) → the `1` and `100` above.
	 */
	boundaries?: number
	/**
	 * Infinite mode only. Default: {@link LoadMoreTrigger.Auto} — loads when the edge enters
	 * view. {@link LoadMoreTrigger.Manual} suppresses auto detection and renders a
	 * "Load more" control.
	 */
	trigger?: LoadMoreTrigger
	/**
	 * Infinite mode only. How close to the edge triggers a load.
	 * `{ rows }` (default 5) drives the virtualized index path; `{ px }` (default 200)
	 * is the IntersectionObserver `rootMargin` for the non-virtualized path.
	 */
	threshold?: { rows?: number } | { px?: number }
	/**
	 * Page-based mode only. Selectable values for {@link PaginationConfig.pageSize}.
	 *
	 * Pure data: supplying it no longer *implies* the control, it only says which sizes the
	 * control offers. Whether the PageSizer mounts is {@link ReactPaginationConfig.toolbar}
	 * — which defaults to "yes when this list is set", so the common case still needs one
	 * field. Changing the selection calls `table.setPageSize`, so it flows through
	 * {@link PaginationConfig.onChange} like any other pagination change.
	 */
	pageSizeOptions?: number[]
	/**
	 * Page-based mode only. Auto-mount the PageSizer control in `Toolbar.left`.
	 *
	 * - omitted — mounted iff {@link ReactPaginationConfig.pageSizeOptions} is set
	 * - `true` — mounted, falling back to
	 *   {@link DATA_GRID_DEFAULTS.pagination.pageSizeOptions} when no list is given
	 * - `false` — never auto-mounted; `<DataGrid.PageSizer />` still works if placed by hand,
	 *   because this flag governs mounting only and never erases
	 *   {@link ReactPaginationConfig.pageSizeOptions}
	 *
	 * Same name and meaning as `sorting.toolbar`, `globalFiltering.toolbar`,
	 * `filtering.toolbar` and `visibility.toolbar`: one word for "auto-mount my
	 * control into the toolbar", on every feature that has one.
	 */
	toolbar?: boolean
}

/**
 * Normalized infinite-scroll config stored on the table instance for the hook to read.
 * Carries the user-owned `hasNextPage` descriptor (read reactively each render) alongside
 * detection tuning — `state.infinite` stays 100% grid-owned.
 */
export type NormalizedInfiniteConfig = {
	trigger: LoadMoreTrigger
	threshold: { rows?: number; px?: number }
	hasNextPage: boolean
	hasPreviousPage: boolean
	onLoadMore?: (ctx: { direction: LoadMoreDirection }) => Promise<void> | void
}

function normalizeInfinite(
	pagination: boolean | ReactPaginationConfig | undefined,
): NormalizedInfiniteConfig | undefined {
	const cfg = featureConfig(pagination)
	if (cfg?.mode !== PaginationMode.Infinite) return undefined
	const threshold = cfg.threshold ?? { rows: DATA_GRID_DEFAULTS.infinite.threshold.rows }
	return {
		trigger: cfg.trigger ?? DATA_GRID_DEFAULTS.infinite.trigger,
		threshold,
		hasNextPage: cfg.hasNextPage ?? false,
		hasPreviousPage: cfg.hasPreviousPage ?? false,
		...(cfg.onLoadMore !== undefined ? { onLoadMore: cfg.onLoadMore } : {}),
	}
}

/**
 * Fully resolved `numbered` page-link window stored on the table instance for `Pagination` to
 * read. Both fields are required here — the `undefined`s from {@link ReactPaginationConfig}
 * are settled against {@link DATA_GRID_DEFAULTS} once, in the hook.
 */
export type NormalizedPageWindowConfig = {
	siblings: number
	boundaries: number
}

/**
 * The headless {@link VisibilityConfig} plus this layer's `toolbar` auto-mount flag —
 * the same `React*` shape every other feature uses, so `onChange` is reachable from a grid
 * that only ever imports the adapter.
 */
export type VisibilityUIConfig = VisibilityConfig & {
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

export type FilterChipsConfig = {
	/**
	 * Where to render the auto-mounted chips strip relative to the table.
	 * Default: {@link FilterChipsPosition.Above}.
	 */
	position?: FilterChipsPosition
}

export type FilteringToolbarConfig = {
	/** When true the Clear-all button is rendered (disabled) even with no active filters. Default: false. */
	alwaysShow?: boolean
}

export type ReactFilteringConfig = {
	/** Display variant for column filter controls. Default: {@link FilteringVariant.Inline}. */
	variant?: FilteringVariant
	/**
	 * Commit debounce in milliseconds for text filter inputs. Default: 250.
	 *
	 * This is the grid's **shared** filter debounce: the global search box falls back to it
	 * too, so setting it here retimes every text filter at once. `globalFiltering.debounce`
	 * overrides it for the search box alone. `0` commits on every keystroke.
	 *
	 * Discrete controls (between, multi-select, select/badge, custom components)
	 * always commit instantly and are unaffected by this option.
	 */
	debounce?: number
	/**
	 * Auto-mount a strip of removable chips for active filters.
	 * - `false` / omitted — no auto-mount. `<DataGrid.ActiveFiltersBar />` still works manually.
	 * - `true` — auto-mount at {@link FilterChipsPosition.Above}.
	 * - `FilterChipsConfig` — fine-grained.
	 */
	chips?: boolean | FilterChipsConfig
	/**
	 * Auto-mount filtering's toolbar control — the Clear-all button — into `Toolbar.right`
	 * after `GlobalFilterInput`. Hidden when no filter is active unless `alwaysShow: true`.
	 *
	 * - `false` / omitted — no auto-mount. `<DataGrid.ClearFiltersButton />` still works manually.
	 * - `true` — auto-mount with default behaviour.
	 * - {@link FilteringToolbarConfig} — fine-grained.
	 *
	 * `chips` is deliberately **not** folded in here: the chips strip renders above or below
	 * the table, not in the toolbar, so `toolbar` would be the wrong word for it.
	 */
	toolbar?: boolean | FilteringToolbarConfig
} & FilteringConfig

/** Normalized shape stored on the table instance for `DataGrid` root to read. */
export type NormalizedFilterChipsConfig = {
	position: FilterChipsPosition
}

/** Normalized shape stored on the table instance for `Toolbar` / `ClearFiltersButton` to read. */
export type NormalizedFilteringToolbarConfig = {
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
	 * Commit debounce in milliseconds for the auto-mounted search input.
	 * Defaults to the shared {@link ReactFilteringConfig.debounce} (250) — set this only when
	 * the search box should be timed differently from the column filters.
	 * `0` disables debouncing.
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

/**
 * React-layer config for sorting.
 *
 * Adds the UI-facing `toolbar` flag on top of the headless {@link SortingConfig}. The flag
 * lives here and not in core for the same reason `globalFiltering.toolbar` and
 * `visibility.toolbar` do: core renders nothing, so an option core must document as
 * "ignored by core" belongs to the layer that actually reads it.
 */
export type ReactSortingConfig = {
	/**
	 * Auto-mount the multi-sort builder button in the Toolbar. Default: false.
	 * - `false` / omitted — no auto-mount. `<DataGrid.SortTrigger />` still works manually.
	 * - `true` — auto-mount into `Toolbar.right`.
	 */
	toolbar?: boolean
} & SortingConfig

/**
 * Presentational layout of the grid shell. Purely visual — nothing here changes the row model.
 */
export type LayoutConfig = {
	/**
	 * Make the table header stick to the top while the body scrolls.
	 *
	 * Requires a bounded scroll container, which the structural stylesheet gives it:
	 * {@link LayoutConfig.maxHeight}, or the `400px` fallback baked into
	 * `--dg-table-max-height`.
	 */
	stickyHeader?: boolean
	/**
	 * Height of the scroll container, as any CSS length (`'32rem'`, `'60vh'`, `'500px'`).
	 *
	 * Writes the CSS custom properties the structural stylesheet already reads —
	 * `--dg-table-max-height` normally, `--dg-virtual-height` under
	 * {@link UseDataGridConfig.virtualization}, where the container needs a definite height
	 * rather than a cap. Both were previously reachable only by setting the variable on a
	 * parent by hand, which is not something an option list can document.
	 *
	 * Omitted, the stylesheet defaults apply: `400px` capped, `600px` virtualized.
	 */
	maxHeight?: string
}

/**
 * Per-row DOM props, resolved for every rendered row and forwarded to the kit's `Tr`.
 *
 * The one thing the grid could not express: "style rows whose status is failed". Replacing the
 * `Tr` component reaches every row and knows nothing about the data; a `<DataGrid.Body>` render
 * function reaches the data but gives up pinned rows, expanded panels, the creating row, the
 * fallback states, the infinite footer and the refetch overlay along with it.
 *
 * Structural attributes the stylesheet depends on — `data-slot`, `data-row-id`, `data-depth`,
 * `data-pinned`, `data-virtual` — are applied **after** this and win; `className` is appended to
 * the kit's own rather than replacing it. Everything else (`title`, `onClick`, `aria-*`, `style`)
 * lands as given.
 *
 * Called during render, once per visible row: keep it cheap and free of side effects.
 */
export type RowPropsResolver<TRow extends object> = (row: Row<TRow>) => HTMLAttributes<HTMLTableRowElement> | undefined

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
	 * - `{ variant: FilteringVariant.Popover }` — filter icon in header; click opens a popover with the filter input
	 * - `{ variant: FilteringVariant.Inline, ...opts }` — same as `true` with extra FilteringConfig options
	 */
	filtering?: boolean | ReactFilteringConfig
	/**
	 * Enable cross-column global search.
	 * - `true` — auto-mounts a search input in Toolbar.right with defaults
	 *   (`placeholder: 'Search…'`, the shared `filtering.debounce`, `includesString` match)
	 * - {@link ReactGlobalFilteringConfig} — fine-grained control over placeholder,
	 *   debounce, filter function, registry, and auto-mount
	 */
	globalFiltering?: boolean | ReactGlobalFilteringConfig
	/** Custom cell type renderers. Merged with types passed directly to `DataGrid`. */
	cellTypes?: CellTypeRegistry
	/**
	 * Enable row selection.
	 * - `false` / omitted — disabled
	 * - `true` — enabled (multi-select) with no info panel
	 * - {@link ReactSelectionConfig} — headless options (`onChange`, `multi`) plus the
	 *   React-only `panel` (selection info bar). `panel` renders only when selection is enabled.
	 */
	selection?: boolean | ReactSelectionConfig<TRow>
	/**
	 * Column visibility UI config.
	 * - `true` — enables column visibility (toolbar button shown)
	 * - `{ toolbar: true }` — shows toggle button in toolbar
	 */
	visibility?: boolean | VisibilityUIConfig
	/**
	 * Controlled table state. Pass a partial `TableState` to control specific portions
	 * (e.g. only sorting) while leaving the rest internally managed.
	 * Must be used together with `onStateChange` to reflect state updates back.
	 */
	state?: Partial<TableState>
	/**
	 * Per-row DOM props — see {@link RowPropsResolver}.
	 *
	 * @example
	 * ```tsx
	 * rowProps: (row) => (row.original.status === 'failed' ? { className: 'bg-red-50' } : undefined)
	 * ```
	 */
	rowProps?: RowPropsResolver<TRow>
	/**
	 * Presentational layout of the grid shell — how tall it is and whether its header sticks.
	 *
	 * Deliberately its own group rather than loose root flags: everything here is about the
	 * chrome around the rows, not about a feature, and the group is where `density` /
	 * `striped` / `borders` will land without each arriving as another root-level boolean
	 * beside `sorting` and `editing`.
	 */
	layout?: LayoutConfig
	/**
	 * Pagination config. Page-based by default; set `mode: PaginationMode.Infinite` for infinite
	 * scroll. The React layer adds `trigger` / `threshold` detection tuning on top of
	 * the headless {@link PaginationConfig}.
	 */
	pagination?: boolean | ReactPaginationConfig
	/**
	 * Sorting config. The React layer adds the `toolbar` auto-mount flag on top of the
	 * headless {@link SortingConfig}.
	 */
	sorting?: boolean | ReactSortingConfig
	/** Expanding config. See {@link ReactExpandingConfig}. */
	expanding?: boolean | ReactExpandingConfig<TRow>
} & Omit<
	TableConfig<TRow>,
	'filtering' | 'globalFiltering' | 'expanding' | 'visibility' | 'pagination' | 'selection' | 'sorting'
>

/**
 * A write feature is enabled by its handler, not by its presence in the merged options.
 *
 * `creating`, `editing` and `deleting` can be described by a defaults layer
 * ({@link DataGridOptionsProvider} or the kit factory) that has no handler to give — it only
 * knows how a write should *look*. A grid that supplies no `onSave` / `onDelete` therefore
 * resolves the feature away instead of rendering a trigger whose commit would call `undefined`.
 */
function enabledByHandler<TConfig extends FeatureToggle>(config: TConfig | undefined, handler: keyof TConfig) {
	if (config === undefined || config.enabled === false) return undefined
	return typeof config[handler] === 'function' ? config : undefined
}

/**
 * Builds the write-feature slice of the table options, omitting every feature that resolved
 * to `undefined` — the keys are optional under `exactOptionalPropertyTypes`, so they must be
 * absent rather than set to `undefined`.
 */
function writeFeatureOptions<TRow extends object>(
	creating: CreatingConfig<TRow> | undefined,
	editing: EditingConfig<TRow> | undefined,
	deleting: DeletingConfig<TRow> | undefined,
) {
	return {
		...(creating !== undefined ? { creating } : {}),
		...(editing !== undefined ? { editing } : {}),
		...(deleting !== undefined ? { deleting } : {}),
	}
}

/**
 * React hook that constructs the grid's `DataTable` once and returns it on every render. The
 * reference is stable — the table is created exactly once.
 *
 * The table **is** the return value; there is no wrapper around it. Everything imperative is a
 * method on it (`table.setPageIndex`, `table.creating.start()`, `table.setData`), the resolved
 * React options live on `table.grid`, and `table.subscribe` / `getSnapshot` /
 * `getInitialSnapshot` are what `useDataGridSelector` reads.
 *
 * `useDataGrid` itself does NOT subscribe to state changes. Components that
 * need to re-render on table state updates should call `useDataGridState`
 * (or `useDataGridState((s) => s)` for a deliberately broad subscription).
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
): DataTable<TRow> {
	const providerDefaults = useDataGridOptions<TRow>()
	const config = mergeGridOptionLayers(factoryDefaults, providerDefaults, instanceConfig)
	const creating = enabledByHandler(config.creating, 'onSave')
	const editing = enabledByHandler(config.editing, 'onSave')
	const deleting = enabledByHandler(config.deleting, 'onDelete')
	const {
		cellTypes,
		selection: rawSelection,
		visibility,
		fallbacks,
		filtering: rawFiltering,
		globalFiltering: rawGlobalFiltering,
		expanding: rawExpanding,
		pagination: rawPagination,
		state,
		onStateChange,
		layout,
		rowProps,
		...restConfig
	} = config

	// Split `selection` into the headless core part (`onChange` / `multi`) passed to
	// createTable and the React-only `panel` stored on the instance for SelectionBar to read.
	// `panel` is stripped so the core `selection` config never carries React-specific fields.
	const selectionPanel: boolean | SelectionPanelConfig<TRow> | undefined = featureConfig(rawSelection)?.panel
	const coreSelection: boolean | SelectionConfig | undefined =
		typeof rawSelection === 'object' ? (({ panel: _panel, ...rest }) => rest)(rawSelection) : rawSelection

	// Split pagination into the headless core part (strip React-only detection tuning and
	// the display-only `variant`) and the normalized infinite config stored on the instance
	// for the infinite hook.
	const corePagination: boolean | PaginationConfig | undefined =
		typeof rawPagination === 'object'
			? (({
					trigger: _trigger,
					threshold: _threshold,
					variant: _variant,
					siblings: _siblings,
					boundaries: _boundaries,
					pageSizeOptions: _pageSizeOptions,
					toolbar: _toolbar,
					...rest
				}) => rest)(rawPagination)
			: rawPagination
	const normalizedInfinite = normalizeInfinite(rawPagination)

	// Page-based only: the selector drives `pageSize`, which infinite mode does not page by.
	const paginationCfg = featureConfig(rawPagination)

	// Which sizes the control offers. Resolved whenever page-based pagination is on, and
	// deliberately independent of whether the toolbar auto-mounts it: `toolbar: false` means
	// "do not mount it for me", not "there are no sizes" — a hand-placed
	// `<DataGrid.PageSizer />` still needs the list.
	// `featureConfig` yields `undefined` for the bare `pagination: true`, so the on/off decision
	// reads `isFeatureEnabled` and only the *settings* come from `paginationCfg`.
	const isPagedPagination = isFeatureEnabled(rawPagination) && paginationCfg?.mode !== PaginationMode.Infinite
	const pageSizeOptions: number[] | undefined = isPagedPagination
		? (paginationCfg?.pageSizeOptions ?? [...DATA_GRID_DEFAULTS.pagination.pageSizeOptions])
		: undefined

	// Whether `<Toolbar>` mounts the PageSizer itself. Defaults to "yes when a list was
	// supplied", so the one-field case is unchanged.
	const pageSizerInToolbar: boolean =
		isPagedPagination && (paginationCfg?.toolbar ?? paginationCfg?.pageSizeOptions !== undefined)

	const paginationVariant: PaginationVariant = paginationCfg?.variant ?? DATA_GRID_DEFAULTS.pagination.variant

	// Resolved once here — like the variant — so no UI kit ever has to fall back for itself.
	const paginationWindow: NormalizedPageWindowConfig = {
		siblings: paginationCfg?.siblings ?? DATA_GRID_DEFAULTS.pagination.siblings,
		boundaries: paginationCfg?.boundaries ?? DATA_GRID_DEFAULTS.pagination.boundaries,
	}

	// Build core-compatible expanding config (strip React-only fields)
	const reactExpandingCfg = featureConfig(rawExpanding)
	const coreGetRowCanExpand =
		reactExpandingCfg?.getRowCanExpand ?? (reactExpandingCfg?.renderExpanded !== undefined ? () => true : undefined)
	const coreExpanding: boolean | ExpandingConfig | undefined =
		rawExpanding === undefined
			? undefined
			: typeof rawExpanding === 'boolean'
				? rawExpanding
				: ({
						...(rawExpanding.mode !== undefined ? { mode: rawExpanding.mode } : {}),
						...(rawExpanding.getSubRows !== undefined
							? { getSubRows: rawExpanding.getSubRows as ExpandingConfig['getSubRows'] }
							: {}),
						...(coreGetRowCanExpand !== undefined ? { getRowCanExpand: coreGetRowCanExpand } : {}),
					} as ExpandingConfig)

	const filteringCfg = featureConfig(rawFiltering)

	const filteringVariant: FilteringVariant = filteringCfg?.variant ?? DATA_GRID_DEFAULTS.filtering.variant

	const filteringDebounce: number = filteringCfg?.debounce ?? DEFAULT_FILTER_DEBOUNCE_MS

	const normalizedChips: NormalizedFilterChipsConfig | undefined = (() => {
		const chips = filteringCfg?.chips
		if (chips === undefined || chips === false) return undefined
		if (chips === true) return { position: DATA_GRID_DEFAULTS.filtering.chips.position }
		return { position: chips.position ?? DATA_GRID_DEFAULTS.filtering.chips.position }
	})()

	const normalizedFilteringToolbar: NormalizedFilteringToolbarConfig | undefined = (() => {
		const toolbar = filteringCfg?.toolbar
		if (toolbar === undefined || toolbar === false) return undefined
		if (toolbar === true) return { alwaysShow: DATA_GRID_DEFAULTS.filtering.toolbar.alwaysShow }
		return { alwaysShow: Boolean(toolbar.alwaysShow) }
	})()

	const coreFiltering: boolean | FilteringConfig | undefined =
		typeof rawFiltering === 'object'
			? (({ variant: _v, chips: _c, toolbar: _t, debounce: _d, ...rest }) => rest)(rawFiltering)
			: rawFiltering

	// Split `globalFiltering` into:
	// - core part (fn, fns) — passed through to createTable
	// - UI part (placeholder, debounce, toolbar) — stored on the table instance
	//   via GLOBAL_FILTERING_KEY so Toolbar / GlobalFilterInput can read it
	const normalizedGlobalFiltering: NormalizedGlobalFilteringConfig | undefined = (() => {
		if (!isFeatureEnabled(rawGlobalFiltering)) return undefined
		if (typeof rawGlobalFiltering !== 'object') {
			return {
				placeholder: DATA_GRID_DEFAULTS.globalFiltering.placeholder,
				debounce: filteringDebounce,
				toolbar: true,
			}
		}
		return {
			placeholder: rawGlobalFiltering.placeholder ?? DATA_GRID_DEFAULTS.globalFiltering.placeholder,
			// Falls back to the shared column-filter debounce, not to a second default of its
			// own: one gesture, one timing, unless this box explicitly asks for another.
			debounce: rawGlobalFiltering.debounce ?? filteringDebounce,
			toolbar: rawGlobalFiltering.toolbar !== false,
		}
	})()

	const coreGlobalFiltering: boolean | GlobalFilteringConfig | undefined = (() => {
		if (rawGlobalFiltering === undefined || rawGlobalFiltering === false) return rawGlobalFiltering
		if (rawGlobalFiltering === true) return true
		// Strip the React-only UI fields and pass the rest through, rather than
		// picking known core fields by name: an allowlist silently drops whatever it
		// has not heard of — which is how `onChange` used to never reach the core and
		// server-side global search never fired.
		const { placeholder: _placeholder, debounce: _debounce, toolbar: _toolbar, ...coreFields } = rawGlobalFiltering
		return Object.keys(coreFields).length > 0 ? coreFields : true
	})()

	// Stable ref so the table closure always calls the latest onStateChange without re-creating the table
	const onStateChangeRef = useRef(onStateChange)
	onStateChangeRef.current = onStateChange

	const tableRef = useRef<DataTable<TRow> | null>(null)
	tableRef.current ??= prepareDataGridTable(
		createTable({
			...restConfig,
			...writeFeatureOptions(creating, editing, deleting),
			filtering: coreFiltering,
			globalFiltering: coreGlobalFiltering,
			expanding: coreExpanding,
			pagination: corePagination,
			selection: coreSelection,
			// Only the resolved on/off reaches core — its option is a plain `boolean`, so a
			// misspelled UI key can never ride along unchecked. The React UI config
			// (`toolbar` etc.) is layered separately via the COLUMN_VISIBILITY_KEY symbol.
			visibility: isFeatureEnabled(visibility),
			onStateChange: (nextState) => onStateChangeRef.current?.(nextState),
		} as TableConfig<TRow>),
	)
	const table = tableRef.current

	// Sync controlled state on every render — external state portions override internal state.
	//
	// We must push the update into BOTH TanStack's `options.state` AND the external
	// snapshot store the React layer subscribes to (`useDataGridState`), otherwise
	// components like Body never see the change. `syncControlledState` does both in
	// one shot and skips `onStateChange` — the prop is the source of truth, so firing
	// the callback would loop back through a consumer that mirrors it into React state.
	//
	// Skip the call when every supplied slice is referentially equal to the current
	// snapshot — avoids redundant `store.setState` notifications on every render.
	//
	// The write is `silent`: it must happen during render so this very render reads
	// the controlled values, but notifying here would run a subscribed child's
	// `useSyncExternalStore` callback while this component is still rendering —
	// React's "Cannot update a component while rendering a different component".
	// Children re-render in this same pass and read the fresh snapshot themselves;
	// the layout effect below wakes any subscriber that bailed out of the pass
	// (a memoized subtree, a portal), before the browser paints.
	const pendingNotifyRef = useRef(false)
	if (state !== undefined) {
		const snapshot = table.getSnapshot()
		const hasChanges = (Object.keys(state) as (keyof TableState)[]).some((key) => snapshot[key] !== state[key])
		if (hasChanges) {
			table.syncControlledState(state, { silent: true })
			pendingNotifyRef.current = true
		}
	}
	useSafeLayoutEffect(() => {
		if (!pendingNotifyRef.current) return
		pendingNotifyRef.current = false
		// Cannot loop: notifying does not mutate state, so the next render finds
		// every controlled slice equal and syncs nothing.
		table.notifyStateSubscribers()
	})

	// Re-sync feature configs every render so callbacks (e.g. creating.onSave)
	// see the latest captured props/state instead of the closure from first mount.
	// The three keys are dropped before being re-added so a grid that stops supplying a
	// handler clears the feature instead of keeping the config the previous render set.
	table.setOptions((prev) => {
		const { creating: _creating, editing: _editing, deleting: _deleting, ...rest } = prev
		return { ...rest, ...writeFeatureOptions(creating, editing, deleting) }
	})

	// ── publish the resolved options ─────────────────────────────────────────
	// One typed object on the table instance, reassigned every render so every reader sees
	// the freshest closures (notably `infinite.onLoadMore`). This replaced eighteen private
	// `Symbol()` keys, each written and read through an untyped double cast.
	const colPinEnabled = config.pinning === true || Boolean(featureConfig(config.pinning)?.column)
	const virtualizationConfig = normalizeVirtualization(config.virtualization)
	const expandingCfg = featureConfig(rawExpanding)

	table.grid = {
		cellTypes,
		...(rowProps !== undefined ? { rowProps: rowProps as unknown as RowPropsResolver<never> } : {}),
		layout: {
			stickyHeader: layout?.stickyHeader ?? false,
			...(layout?.maxHeight !== undefined ? { maxHeight: layout.maxHeight } : {}),
		},
		columnPinning: colPinEnabled,
		visibility: isFeatureEnabled(visibility) ? visibility : undefined,
		sorting: isFeatureEnabled(config.sorting) ? config.sorting : undefined,
		filtering: {
			variant: filteringVariant,
			debounce: filteringDebounce,
			chips: normalizedChips,
			toolbar: normalizedFilteringToolbar,
		},
		globalFiltering: normalizedGlobalFiltering,
		pagination: {
			variant: paginationVariant,
			window: paginationWindow,
			...(pageSizeOptions !== undefined ? { pageSizeOptions } : {}),
			pageSizer: pageSizerInToolbar,
		},
		infinite: normalizedInfinite,
		selection: { panel: selectionPanel as ResolvedGridOptions['selection']['panel'] },
		expanding: {
			renderExpanded: expandingCfg?.renderExpanded as ResolvedGridOptions['expanding']['renderExpanded'],
		},
		fallbacks,
		virtualization: virtualizationConfig,
	}

	// NOTE: useDataGrid no longer calls useSyncExternalStore. Components that
	// need to re-render on state changes subscribe themselves via
	// `useDataGridState`, which always names the slice it depends on.

	// Sync data synchronously during render — symmetrically with the other
	// option-sync blocks above. Doing this in `useEffect` would update
	// `options.data` AFTER child components (Body / Cell) had already
	// rendered with the previous data, leaving the UI one step behind until
	// another unrelated state change forced a re-render.
	const dataRef = useRef(config.data)
	if (config.data !== dataRef.current) {
		dataRef.current = config.data
		table.setOptions((prev) => ({ ...prev, data: config.data }))
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
		table.setOptions((prev) => {
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

	// Clamp `pageIndex` to the last valid page when a manual-pagination `rowCount` shrinks
	// under the user (e.g. a server filter narrows 500 rows to 5 while they sit on page 3).
	// TanStack defaults `autoResetPageIndex` to `!manualPagination`, so under manual mode it
	// never rewinds the index itself, and the resync above only projects the descriptors. Left
	// alone, the footer reads "0–0 of 5" while `getPaginationRowModel()` — which returns the
	// whole `data` under manual mode — still renders all 5 rows: the label contradicts the screen.
	//
	// Deliberately an effect rather than a render-body write like the sync blocks above:
	// `setPageIndex` routes through `onStateChange`, i.e. the **consumer's** callback. Those
	// blocks never reach the consumer — `setOptions` fires no callback and `syncControlledState`
	// skips `onStateChange` on purpose (see the comment above it). Writing here during render
	// would therefore setState a parent mid-render ("Cannot update a component while rendering a
	// different component"), so the notification waits for commit. The cost is one frame of the
	// pre-clamp label — which is exactly the honest "0–0 of 5" the footer already shows today,
	// never the inverted range.
	//
	// Only an actual **shrink** of a trusted `rowCount` clamps — never the first total we see.
	// `rowCount: data?.rowCount ?? 0` is the canonical manual shape, so the initial `0` usually
	// means "not loaded yet" rather than "empty" (the resync above says as much), and it is
	// indistinguishable from a genuine empty result. Clamping on it would reset a deep-linked
	// `pageIndex` while its fetch is still in flight — the exact inverse of the bug being fixed:
	// #82 loses the user's rows, that would lose the user's page. An unknown total (`pageCount`
	// sentinel / no total at all) has nothing to clamp to either.
	//
	// A shrink can only move `pageIndex` down, and the deps change only when the total does, so
	// one pass per shrink cannot re-trigger itself: a consumer that ignores the callback stays put
	// instead of looping. Note this deliberately ignores a `pageSize` change at an unchanged
	// total — `table.setPageSize` already rebases `pageIndex` itself, so only a consumer driving
	// `pageSize` from its own state could sit out of range, which is outside this fix's scope.
	const prevRowCountRef = useRef<number | undefined>(undefined)
	useEffect(() => {
		const prevRowCount = prevRowCountRef.current
		prevRowCountRef.current = nextRowCount
		if (nextRowCount === undefined || prevRowCount === undefined) return
		if (nextRowCount >= prevRowCount) return
		const { pageIndex, pageSize } = table.getState().pagination
		// An empty or otherwise degenerate total collapses to the single first page.
		const lastPageIndex = nextRowCount <= 0 || pageSize <= 0 ? 0 : Math.ceil(nextRowCount / pageSize) - 1
		if (pageIndex > lastPageIndex) table.setPageIndex(lastPageIndex)
	}, [table, nextRowCount])

	// The loading status (`isPending`/`isFetching`/`isError`/`error`) is user-owned
	// controlled state fed through the `state.loading` slice; it is handled by the
	// generic `state` sync block above and the grid never writes it. hasNextPage is a
	// pagination option read reactively from INFINITE_KEY by useInfiniteScroll. Neither
	// needs a bespoke projection here.

	return table
}
