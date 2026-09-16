import { defaultMessages, GridDirection, RowActionsPlacement } from '@ez-kit/data-grid-core'

import { DATA_GRID_DEFAULTS } from './defaults'

import type { CellTypeRegistry } from './cell-types-context'
import type { PaginationLabelModel } from './data-grid/pagination-label'
import type { PaginationLabel } from './types'
import type {
	ExpandedRowProps,
	FilteringVariant,
	LayoutClassNames,
	NormalizedFallbacksConfig,
	NormalizedFeatureToolbarConfig,
	NormalizedFilterChipsConfig,
	NormalizedFilteringToolbarConfig,
	NormalizedFilterPanelConfig,
	NormalizedGlobalFilteringConfig,
	NormalizedInfiniteConfig,
	NormalizedPageSizerConfig,
	NormalizedSelectionBarConfig,
	NormalizedVirtualizationConfig,
	RowPropsResolver,
} from './use-data-grid'
import type { GridMessages, GridOptions, RowPinningConfig } from '@ez-kit/data-grid-core'
import type { ComponentType, ReactNode } from 'react'

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
	 * Every user-facing string, **complete** — the English dictionary with the grid's `messages`
	 * folded onto it. Never partial, so a component reads `messages.pagination.rowsPerPage`
	 * without a fallback of its own, and a UI kit has no reason to hold a literal.
	 */
	messages: GridMessages
	/**
	 * Per-row DOM props resolver. Row-erased here, like `expanding.component` and the cell registry —
	 * every reader of `table.grid` is a component with no `TRow` of its own.
	 */
	rowProps?: RowPropsResolver<never> | undefined
	/** Resolved presentational layout of the grid shell. */
	layout: {
		/** The header sticks to the top of the scroll container. */
		stickyHeader: boolean
		/** The default layout mounts the `<tfoot>` built from each column's `footer`. */
		footer: boolean
		/** The footer sticks to the bottom of the scroll container. */
		stickyFooter: boolean
		/** Explicit scroll-container height, as a CSS length. `undefined` → stylesheet default. */
		maxHeight?: string | undefined
		/** Classes for the shell's wrapper / scrollport boxes. `undefined` → neither is classed. */
		classNames?: LayoutClassNames | undefined
	}
	/**
	 * Reordering, resolved per axis — the same shape as `pinning` beside it, and for the same
	 * reason: the axes are independent features.
	 */
	ordering: {
		/** The column menu offers its move entries, and headers answer `Alt+Arrow`. */
		column: boolean
		/**
		 * The row menu offers its move entries, and rows answer `Alt+ArrowUp` / `Alt+ArrowDown`.
		 *
		 * The shortcut reaches the row only in kits whose `Tr` forwards `onKeyDown`; React Aria
		 * does not, so under heroui the menu entries are the whole affordance. See `kit-parity`.
		 */
		row: boolean
		/**
		 * The Columns toggle offers the same two moves, and lists every non-system column
		 * rather than only the hideable ones. Off unless `ordering.column.visibilityMenu`
		 * asked for it; always `false` while the column axis itself is off.
		 */
		visibilityMenu: boolean
	}
	/**
	 * Pinning, resolved per axis — the two halves of the `pinning` option under the two names
	 * the option gives them. It was a single flat `columnPinning: boolean`, which spelled
	 * `pinning.column` a third way and left `pinning.row` unreadable from here at all, so a kit
	 * that wanted to know whether row pinning was on had to go back to `table.options`.
	 *
	 * (This docblock sat above `ordering` rather than here, behind a second one — of two adjacent
	 * block comments only the nearer attaches, so it documented nothing. Moved with the `rowConfig`
	 * member below.)
	 */
	pinning: {
		/** The column menu offers its pin section. */
		column: boolean
		/** Rows can be pinned to the top and/or bottom. */
		row: boolean
		/**
		 * The **normalized row-pinning config** core resolved — which edges accept a pin, and on
		 * what terms. `undefined` when row pinning is off.
		 *
		 * This is core's `GridOptions.rowPinning`, folded in here rather than carried at top
		 * level under its own name: `rowPinning` beside `pinning.row` would read as two
		 * spellings of one thing when they are a flag and its settings. It is nested under the
		 * axis it configures, and it is deliberately **not** merged into `row` — that one stays
		 * the boolean every component switches on.
		 */
		rowConfig?: RowPinningConfig | undefined
	}
	/**
	 * Layout of the actions cell, and the per-row entries an application contributes — core's
	 * `GridOptions.rowActions`, carried across under its own name because nothing on this object
	 * competed for it.
	 *
	 * Row-erased, like `rowProps` and `expanding.component` beside it: every reader of
	 * `table.grid` is a component with no `TRow` of its own.
	 */
	rowActions: GridOptions<never>['rowActions']
	/**
	 * The grid's text direction, declared once at the root — core's `GridOptions.direction`,
	 * carried across under its own name for the same reason as `rowActions`.
	 */
	direction: GridDirection
	/** Column hiding. `undefined` when the feature is off. */
	visibility?: NormalizedFeatureToolbarConfig | undefined
	/** Sorting UI config. `undefined` when sorting is off. */
	sorting?: NormalizedFeatureToolbarConfig | undefined
	filtering: {
		/**
		 * Display variant for the per-column filter controls. Always resolved, for the same
		 * reason as `debounce` below: a UI kit switching on it must never hit a no-op branch.
		 */
		variant: FilteringVariant
		/**
		 * Commit debounce for text filter inputs. Always resolved, because the global search
		 * box falls back to it even when column filtering is off.
		 */
		debounce: number
		/** Active-filter chips strip. `undefined` when not auto-mounted. */
		chips?: NormalizedFilterChipsConfig | undefined
		/**
		 * The auto-mounted filter panel and the region that holds it. `undefined` unless
		 * {@link FilteringVariant.Panel} — the other variants keep the controls in the header.
		 */
		panel?: NormalizedFilterPanelConfig | undefined
		/** Filtering's toolbar control (the Clear-all button). `undefined` when not auto-mounted. */
		toolbar?: NormalizedFilteringToolbarConfig | undefined
	}
	/** Global search UI config. `undefined` when global search is off. */
	globalFiltering?: NormalizedGlobalFilteringConfig | undefined
	pagination: {
		/**
		 * **Page-based** pagination is on: `pagination` is enabled and its mode is not
		 * `'infinite'`, so the grid slices rows into pages and the footer has something to drive.
		 *
		 * The one flag in this object that answers "is the feature on" rather than "how does it
		 * look", and it is here because nothing else can answer it. Under v8 the question was
		 * asked of `table.options.getPaginationRowModel`, which core attached under exactly this
		 * condition; in v9 the paginated row model is a slot the **consumer** puts in `features`,
		 * so that option is never written and its registration says nothing about whether this
		 * grid was configured to paginate. Reading `items !== undefined` would work — it is
		 * resolved from the same predicate — but that would give one value two meanings, which is
		 * the defect this package's option audits keep removing.
		 */
		enabled: boolean
		/** Page-number links beside prev/next. Resolved. */
		links: boolean
		/** Jump-to-first / jump-to-last buttons. Resolved. */
		edges: boolean
		/**
		 * `links`: pages kept either side of the current one. Resolved.
		 *
		 * Flat, under the option's own name — it is `pagination.siblings` on the config and
		 * `DATA_GRID_DEFAULTS.pagination.siblings` in the defaults table. It was nested under a
		 * `window` key that exists nowhere else, which gave one value a third spelling, the same
		 * way `pagination.pageSizer` gave one to `toolbar`.
		 */
		siblings: number
		/** `links`: pages kept at each end of the strip. Resolved. */
		boundaries: number
		/**
		 * `pagination.label`, resolved to one of the two built-in forms, `false` for "no label",
		 * or the consumer's renderer verbatim. Deliberately **not** resolved to a node here —
		 * the label depends on the live page state, which this options object does not carry;
		 * `<DataGrid.Pagination>` applies it where that state is at hand.
		 */
		label: PaginationLabel | false | ((ctx: PaginationLabelModel) => ReactNode)
		/**
		 * Sizes the PageSizer offers. Present whenever page-based pagination is on, whether or
		 * not the toolbar auto-mounts the control — a hand-placed `<DataGrid.PageSizer />`
		 * reads it too.
		 */
		items?: number[] | undefined
		/**
		 * The auto-mounted PageSizer and the region that holds it. `undefined` when the grid
		 * mounts no PageSizer. Governs mounting only, never the list above.
		 *
		 * Named for the control, not for a container, because it has two homes — the toolbar
		 * and the pagination row. The features whose control has exactly one home keep the
		 * `toolbar` flag ({@link NormalizedFeatureToolbarConfig}, `globalFiltering.toolbar`,
		 * `filtering.toolbar`).
		 */
		pageSizer?: NormalizedPageSizerConfig | undefined
		/**
		 * Infinite-scroll detection config. `undefined` unless `pagination.mode` is
		 * `'infinite'`.
		 *
		 * Under `pagination`, because that is where its options live — `pagination.mode`,
		 * `pagination.trigger`, `pagination.threshold`, `pagination.onLoadMore` — and where
		 * {@link DATA_GRID_DEFAULTS} keys their defaults. A top-level `infinite` was a second
		 * home for one feature.
		 */
		infinite?: NormalizedInfiniteConfig | undefined
	}
	selection: {
		/**
		 * Selection info bar, **resolved**: `variant` settled against the default, the scalar
		 * form expanded, `undefined` when the bar does not render (selection off, or
		 * `bar: false` / `enabled: false`).
		 *
		 * It used to be the raw `boolean | SelectionBarConfig` union — the one option on this
		 * object that had not been resolved — so three components inside this package re-derived
		 * it and a UI kit could not derive it at all, the default variant living in a constant
		 * the package does not export.
		 */
		bar?: NormalizedSelectionBarConfig | undefined
	}
	expanding: {
		/** Sub-content detail-panel renderer, if one was supplied. */
		component?: ComponentType<ExpandedRowProps<never>> | undefined
	}
	/**
	 * Loading / empty / no-results fallbacks, **resolved** — all three present, each with a
	 * settled `enabled` and the `component` override when one was given. It was the raw
	 * `FallbacksConfig`, whose three `boolean | Config` unions four components had to put
	 * through the same "omitted means on" helper.
	 */
	fallbacks: NormalizedFallbacksConfig
	/**
	 * Row virtualization config, **normalized**. `undefined` when virtualization is off.
	 *
	 * This name is the one collision between core's `GridOptions` and this object where both
	 * sides held the same option, and **react's wins outright**: core passes the option through
	 * unresolved (`boolean | VirtualizationConfig`), every one of this package's seven readers
	 * wants the normalized shape, and `true` versus `{ row: {…} }` are both truthy — so a merged
	 * bag carrying both would hand a reader the other shape with nothing to notice it by. Core's
	 * unresolved value is therefore **dropped rather than renamed**: it is the same option one
	 * step earlier, and keeping it would put a second answer beside the first.
	 */
	virtualization?: NormalizedVirtualizationConfig | undefined
}

/**
 * A grid with every feature off — the shape `table.grid` holds before (or without) a
 * `useDataGrid` call.
 *
 * `prepareDataGridTable` seeds it, so `table.grid` is **always** an object and no reader
 * needs to guard the property itself. That matters for a table built straight from
 * `createTable` — a headless test, or a consumer driving the compound components by hand —
 * which would otherwise crash the first component that read a nested field.
 *
 * @param core The bag `createTable` already wrote to `table.grid` ({@link GridOptions}), whose
 *   four members are folded in rather than overwritten. Omit it only for a table that never went
 *   through our `createTable`.
 */
export function defaultResolvedGridOptions(core?: GridOptions<never>): ResolvedGridOptions {
	return {
		cellTypes: undefined,
		messages: defaultMessages,
		// Core's four, folded in under this object's names. It **merges onto** what `createTable`
		// wrote rather than replacing it: the caller passes `table.grid`, and the defaults below
		// cover a table that was not built by our `createTable` at all (a hand-rolled TanStack
		// table driven through the compound components, or a test double).
		rowActions: core?.rowActions ?? { placement: RowActionsPlacement.Inline },
		direction: core?.direction ?? GridDirection.Ltr,
		layout: { stickyHeader: false, footer: false, stickyFooter: false },
		ordering: { column: false, row: false, visibilityMenu: false },
		// `column` / `row` stay off — this is the all-features-off shape — while `rowConfig`
		// carries core's normalized settings across when it resolved any. `exactOptionalPropertyTypes`
		// is why it is spread rather than assigned `undefined`.
		pinning: { column: false, row: false, ...(core?.rowPinning !== undefined ? { rowConfig: core.rowPinning } : {}) },
		filtering: {
			variant: DATA_GRID_DEFAULTS.filtering.variant,
			debounce: DATA_GRID_DEFAULTS.filtering.debounce,
		},
		pagination: {
			enabled: false,
			links: DATA_GRID_DEFAULTS.pagination.links,
			edges: DATA_GRID_DEFAULTS.pagination.edges,
			label: DATA_GRID_DEFAULTS.pagination.label,
			siblings: DATA_GRID_DEFAULTS.pagination.siblings,
			boundaries: DATA_GRID_DEFAULTS.pagination.boundaries,
		},
		selection: {},
		expanding: {},
		// Every feature is off here, but a fallback is not a feature: a grid with nothing to
		// show still has to show something, so the three states are on and readers can rely on
		// the group being present.
		fallbacks: { loading: { enabled: true }, empty: { enabled: true }, noResults: { enabled: true } },
	}
}
