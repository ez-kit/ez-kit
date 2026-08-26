import { DATA_GRID_DEFAULTS } from './defaults'

import type { CellTypeRegistry } from './cell-types-context'
import type { PaginationVariant } from './types'
import type {
	ColumnVisibilityUIConfig,
	ExpandedRowProps,
	FallbacksConfig,
	FilteringVariant,
	NormalizedFilterChipsConfig,
	NormalizedFilteringToolbarConfig,
	NormalizedGlobalFilteringConfig,
	NormalizedInfiniteConfig,
	NormalizedPageWindowConfig,
	NormalizedVirtualizationConfig,
	RowPropsResolver,
	SelectionPanelConfig,
} from './use-data-grid'
import type { RowData } from '@tanstack/table-core'
import type { ComponentType } from 'react'

/**
 * Everything `useDataGrid` decided, in one typed place.
 *
 * The React layer resolves a grid's config once — merging the three option layers, settling
 * defaults, splitting headless fields from UI ones — and every compound component reads the
 * result from here. It replaces eighteen module-private `Symbol()` keys that were written and
 * read through `(table as unknown as Record<symbol, unknown>)[KEY] as SomeConfig`: untyped on
 * both sides, so a normalizer that stopped writing a key produced a silent `undefined` and a
 * component that quietly fell back to its default.
 *
 * It is also **public**. A UI kit could previously only see the props the grid chose to hand
 * its components; anything the grid had resolved — the filter variant, the debounce, whether a
 * control auto-mounts — lived behind keys the package did not export. Read it with
 * {@link useGridOptions}.
 *
 * Optional members are typed `?: T | undefined` rather than plain `?: T` so the hook can build
 * the object with straight assignments under `exactOptionalPropertyTypes`; an absent feature
 * and one explicitly set to `undefined` mean the same thing here.
 */
export type ResolvedGridOptions = {
	/** Cell-type renderers contributed via `useDataGrid({ cellTypes })`. */
	cellTypes: CellTypeRegistry | undefined
	/**
	 * Per-row DOM props resolver. Row-erased here, like `renderExpanded` and the cell registry —
	 * every reader of `table.grid` is a component with no `TRow` of its own.
	 */
	rowProps?: RowPropsResolver<never> | undefined
	/** Resolved presentational layout of the grid shell. */
	layout: {
		/** The header sticks to the top of the scroll container. */
		stickyHeader: boolean
		/** Explicit scroll-container height, as a CSS length. `undefined` → stylesheet default. */
		maxHeight?: string | undefined
	}
	/** Column pinning UI (the pin section of the column menu) is enabled. */
	columnPinning: boolean
	/** Column hiding. `undefined` when the feature is off. */
	columnVisibility?: (boolean | ColumnVisibilityUIConfig) | undefined
	/** Sorting UI config. `undefined` when sorting is off. */
	sorting?: (boolean | { toolbar?: boolean }) | undefined
	filtering: {
		/** Display variant for the per-column filter controls. `undefined` when off. */
		variant?: FilteringVariant | undefined
		/**
		 * Commit debounce for text filter inputs. Always resolved, because the global search
		 * box falls back to it even when column filtering is off.
		 */
		debounce: number
		/** Active-filter chips strip. `undefined` when not auto-mounted. */
		chips?: NormalizedFilterChipsConfig | undefined
		/** Filtering's toolbar control (the Clear-all button). `undefined` when not auto-mounted. */
		toolbar?: NormalizedFilteringToolbarConfig | undefined
	}
	/** Global search UI config. `undefined` when global search is off. */
	globalFiltering?: NormalizedGlobalFilteringConfig | undefined
	pagination: {
		variant: PaginationVariant
		/** Resolved page-link window for the `numbered` variant. */
		window: NormalizedPageWindowConfig
		/**
		 * Sizes the PageSizer offers. Present whenever page-based pagination is on, whether or
		 * not the toolbar auto-mounts the control — a hand-placed `<DataGrid.PageSizer />`
		 * reads it too.
		 */
		pageSizeOptions?: number[] | undefined
		/** The toolbar auto-mounts the PageSizer. Governs mounting only, never the list above. */
		pageSizer: boolean
	}
	/** Infinite-scroll detection config. `undefined` unless `pagination.mode` is `'infinite'`. */
	infinite?: NormalizedInfiniteConfig | undefined
	selection: {
		/** Selection info panel. `undefined` when selection is off or the panel is not configured. */
		panel?: (boolean | SelectionPanelConfig) | undefined
	}
	expanding: {
		/** Sub-content detail-panel renderer, if one was supplied. */
		renderExpanded?: ComponentType<ExpandedRowProps<never>> | undefined
	}
	/** Loading / empty / no-results fallback config. */
	fallbacks?: FallbacksConfig | undefined
	/** Row virtualization config. `undefined` when virtualization is off. */
	virtualization?: NormalizedVirtualizationConfig | undefined
}

declare module '@tanstack/table-core' {
	// The row type is erased here, exactly as it is on the cell-type registry: these are
	// structural UI settings, never row-bound values.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table<TData extends RowData> {
		/**
		 * The React layer's resolved grid options. Written once per render by `useDataGrid`,
		 * read by every compound component and available to a UI kit via `useGridOptions()`.
		 */
		grid: ResolvedGridOptions
	}
}

/**
 * A grid with every feature off — the shape `table.grid` holds before (or without) a
 * `useDataGrid` call.
 *
 * `prepareDataGridTable` seeds it, so `table.grid` is **always** an object and no reader
 * needs to guard the property itself. That matters for a table built straight from
 * `createTable` — a headless test, or a consumer driving the compound components by hand —
 * which would otherwise crash the first component that read a nested field.
 */
export function defaultResolvedGridOptions(): ResolvedGridOptions {
	return {
		cellTypes: undefined,
		layout: { stickyHeader: false },
		columnPinning: false,
		filtering: { debounce: DATA_GRID_DEFAULTS.filtering.debounce },
		pagination: {
			variant: DATA_GRID_DEFAULTS.pagination.variant,
			window: {
				siblings: DATA_GRID_DEFAULTS.pagination.siblings,
				boundaries: DATA_GRID_DEFAULTS.pagination.boundaries,
			},
			pageSizer: false,
		},
		selection: {},
		expanding: {},
	}
}
