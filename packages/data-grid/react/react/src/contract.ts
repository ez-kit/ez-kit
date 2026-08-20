import type { GridComponentRegistry } from './types'

/**
 * The UI-kit contract, grouped by feature.
 *
 * A kit is registered as a **nested, feature-grouped** object — `GridComponents`
 * (partial) or `FullGridComponents` (every feature). The provider flattens it into the
 * internal flat `GridComponentRegistry` that consumers read via `useGridComponents()`.
 *
 * - `FullGridComponents` — a kit that advertises full support for every feature.
 *   Register with `satisfies FullGridComponents` to turn a forgotten component into a
 *   **compile error** instead of a runtime crash.
 * - The `Grid*Components` tier types are each feature's required set, so an external kit
 *   can opt into exactly the features it supports.
 *
 * The single source of truth for "which feature owns which component" is the nested
 * {@link FEATURE_COMPONENTS} map. The tier types, the nested `GridComponents` /
 * `FullGridComponents` shapes, and the flat {@link COMPONENT_FEATURE} lookup are all
 * derived from it, so the grouping is defined in exactly one place.
 */

/** Named, closed set of grid features that own UI-kit components. */
export enum GridFeature {
	Core = 'core',
	Pagination = 'pagination',
	Sorting = 'sorting',
	Filtering = 'filtering',
	Editing = 'editing',
	Selection = 'selection',
	/** Per-row actions column: edit / delete buttons (the row-pin menu uses `core.Menu`). */
	RowActions = 'row-actions',
	Resizing = 'resizing',
	ColumnVisibility = 'column-visibility',
	FallbackStates = 'fallback-states',
	Infinite = 'infinite',
	Expanding = 'expanding',
}

// ── source of truth: feature → its components ────────────────────────────────

/**
 * Every feature and the injectable component keys it owns. `satisfies Record<GridFeature, …>`
 * forces the map to cover every feature; each array is `as const` so the tier types, the
 * nested component shapes, and the flat lookup below can all be derived from it.
 */
export const FEATURE_COMPONENTS = {
	[GridFeature.Core]: [
		'Table',
		'Thead',
		'Tbody',
		'Tr',
		'Th',
		'Td',
		'Button',
		'Input',
		'Checkbox',
		'Toolbar',
		'Menu',
	] as const,
	[GridFeature.Pagination]: ['Pagination', 'PageSizer'] as const,
	[GridFeature.Sorting]: ['SortIndicator', 'SortMenu'] as const,
	[GridFeature.Filtering]: [
		'FilterPopover',
		'FilterPanel',
		'FilterPanelChip',
		'FilterChip',
		'ClearFiltersButton',
		'GlobalFilterInput',
		'OperatorSelect',
		'BetweenInput',
		'MultiSelectFilter',
	] as const,
	[GridFeature.Editing]: ['Modal', 'FormShell', 'ConfirmDialog', 'NumberInput'] as const,
	[GridFeature.Selection]: ['SelectionBar'] as const,
	[GridFeature.RowActions]: ['ActionsCell'] as const,
	[GridFeature.Resizing]: ['Resizer'] as const,
	[GridFeature.ColumnVisibility]: ['ColumnVisibilityMenu'] as const,
	[GridFeature.FallbackStates]: ['LoadingRow', 'EmptyState', 'NoResultsState', 'RefetchOverlay'] as const,
	[GridFeature.Infinite]: ['LoadMoreRow'] as const,
	[GridFeature.Expanding]: ['Chevron'] as const,
} satisfies Record<GridFeature, readonly (keyof GridComponentRegistry)[]>

// ── tier types (derived from FEATURE_COMPONENTS) ─────────────────────────────

/** The required-components obligation for a single feature. */
type ComponentsFor<F extends GridFeature> = Required<
	Pick<GridComponentRegistry, (typeof FEATURE_COMPONENTS)[F][number]>
>

/** Minimum to render a basic table. Always required whenever a grid mounts. */
export type GridCoreComponents = ComponentsFor<GridFeature.Core>
export type GridPaginationComponents = ComponentsFor<GridFeature.Pagination>
export type GridSortingComponents = ComponentsFor<GridFeature.Sorting>
export type GridFilteringComponents = ComponentsFor<GridFeature.Filtering>
export type GridEditingComponents = ComponentsFor<GridFeature.Editing>
export type GridSelectionComponents = ComponentsFor<GridFeature.Selection>
export type GridRowActionsComponents = ComponentsFor<GridFeature.RowActions>
export type GridResizingComponents = ComponentsFor<GridFeature.Resizing>
export type GridColumnVisibilityComponents = ComponentsFor<GridFeature.ColumnVisibility>
export type GridFallbackStateComponents = ComponentsFor<GridFeature.FallbackStates>
export type GridInfiniteComponents = ComponentsFor<GridFeature.Infinite>
export type GridExpandingComponents = ComponentsFor<GridFeature.Expanding>

// ── nested public shapes (derived from the tiers) ────────────────────────────

/**
 * The nested, feature-grouped registry a kit passes to `createDataGrid` /
 * `GridComponentsProvider` / `<DataGrid components>`. Every group is optional and every
 * component within a group is optional — this is the shape a *partial* kit implements.
 */
export type GridComponents = {
	[F in GridFeature]?: Partial<ComponentsFor<F>>
}

/**
 * A kit that advertises full support: every feature group present with every component.
 * Register with `satisfies FullGridComponents` to catch a missing component at compile time.
 */
export type FullGridComponents = {
	[F in GridFeature]: ComponentsFor<F>
}

// ── flat lookup (derived from FEATURE_COMPONENTS) ─────────────────────────────

/** Every injectable component key → the feature that owns it. Flattened from {@link FEATURE_COMPONENTS}. */
export const COMPONENT_FEATURE = Object.fromEntries(
	(Object.entries(FEATURE_COMPONENTS) as [GridFeature, readonly (keyof GridComponentRegistry)[]][]).flatMap(
		([feature, keys]) => keys.map((key) => [key, feature] as const),
	),
) as Record<keyof GridComponentRegistry, GridFeature>
