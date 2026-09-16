'use client'

import { CellTypesProvider, mergeCellTypes } from './cell-types-context'
import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { useDataGridState } from './data-grid/table-context'
import { GridFactoryDefaultsProvider } from './data-grid-options-context'
import { createColumnHelper } from './react-columns'
import { useDataGrid } from './use-data-grid'

import type { CellTypeRegistry } from './cell-types-context'
import type { GridComponents } from './contract'
import type { DataGridControlledProps, DataGridSharedProps, DataGridStatics } from './data-grid/data-grid'
import type { DataGridDefaultOptions } from './data-grid-options-context'
import type { ColumnDef, ColumnHelper } from './react-columns'
import type { DataTable, GridFeatures } from './types'
import type { UseDataGridConfig } from './use-data-grid'
import type { TableFeatures } from '@tanstack/table-core'
import type { ReactElement } from 'react'

/** The ids a registry actually holds, as a string union — what the runtime helper is built from. */
type KitCellTypeId<TCellTypes extends CellTypeRegistry> = Extract<keyof TCellTypes, string>

export type CreateDataGridOptions<
	TCellTypes extends CellTypeRegistry,
	TFeatures extends TableFeatures | undefined = undefined,
> = {
	/**
	 * The kit's components, feature-grouped. Every group and every member is already optional
	 * — `GridComponents` *is* the partial shape a kit implements — so it is spelled the same
	 * way here as on `<GridComponentsProvider components>` and `<DataGrid components>`.
	 */
	components: GridComponents
	cellTypes?: TCellTypes
	/**
	 * The feature set every grid from this bundle runs on, stated once.
	 *
	 * Naming it here makes `features` **optional** on the returned `useDataGrid` and `DataGrid`
	 * — the bundle carries the set, and the return type carries it back out, so a call site
	 * writes `useDataGrid({ data, columns, sorting: true })` and still gets a
	 * `DataTable<TFeatures, TRow>`. A call site that names a set anyway **replaces** this one
	 * rather than merging with it (see `mergeOptionLayers`), which is what keeps one narrow
	 * grid possible under a wide bundle.
	 *
	 * This is a *defaults* layer, not a new rule: it sits under an app-level
	 * `DataGridOptionsProvider` and under the per-call config, exactly like {@link defaults}
	 * below — `features` is simply the one option worth lifting to its own field, because it
	 * is required on every instance config and identical across almost every grid in an app.
	 *
	 * **Only bind it where the bundle is built per application** — the shape-B factory a
	 * project writes in `src/lib/data-grid.ts`. A *kit* package must not: its `createDataGrid`
	 * call is compiled once and shipped to everyone, so a set bound there would drag the whole
	 * feature graph into every consumer's bundle, which is the thing composing a set exists to
	 * prevent.
	 *
	 * Note TypeScript has no partial type-argument inference: writing
	 * `createDataGrid<MyCellTypes>({ … })` pins `TCellTypes` and leaves `TFeatures` at its
	 * `undefined` default, so the binding is silently lost. Pass no type arguments and let both
	 * infer, or name both.
	 */
	features?: TFeatures
	/**
	 * Kit-level default grid options baked into the bundle. Merged as the **base** layer
	 * under an app-level `DataGridOptionsProvider` and the per-call config
	 * (factory `defaults` < provider `defaults` < instance config). Lets a kit ship
	 * opinionated defaults (e.g. `{ sorting: true, visibility: true }`) so consumers
	 * need not repeat them at every `useDataGrid` call site.
	 */
	defaults?: DataGridDefaultOptions<GridFeatures, object>
}

/**
 * {@link UseDataGridConfig} with `features` relaxed to optional — what a bundle built with a
 * factory-level set accepts.
 *
 * Optional rather than removed: a set named here **replaces** the bound one (`mergeOptionLayers`
 * treats `features` as the one option that never accumulates), which is how a single grid
 * narrows below a bundle-wide set. Composing a set is a decision about what exists, so a merge
 * could not express "and not that one".
 */
export type BoundUseDataGridConfig<TFeatures extends TableFeatures, TRow extends object> = Omit<
	UseDataGridConfig<TFeatures, TRow>,
	'features'
> & {
	/** Overrides the bundle's set for this grid alone. Omit to run on the bundle's. */
	features?: TFeatures
}

/*
 * Note both relaxed shapes above are generic over a `TConfigFeatures` that merely *defaults* to
 * the bundle's `TFeatures`, rather than being fixed to it. Fixing it would type-check only an
 * override that is the same set — which is every override except the one worth writing, since
 * the point of naming a set at a call site is to run on a **different**, usually narrower, one.
 * Omitting `features` leaves nothing to infer from, so the parameter falls back to the bundle's
 * set and the return type carries that; naming one infers from it, and the return type carries
 * the override instead. Both are what the runtime does — the layer merge replaces `features`
 * outright — so the types follow the values rather than approximating them.
 */

/** `DataGridProps` with the uncontrolled half's `features` relaxed the same way. */
export type BoundDataGridProps<TFeatures extends TableFeatures, TRow extends object> =
	| DataGridControlledProps<TFeatures, TRow>
	| (DataGridSharedProps & BoundUseDataGridConfig<TFeatures, TRow> & { table?: never })

/**
 * The compound `DataGrid` a feature-bound bundle hands back: the relaxed call signature, and
 * the identical namespace — {@link DataGridStatics} rather than a second copy of twenty-eight
 * members that would then drift from the first.
 */
export type BoundDataGrid<TFeatures extends TableFeatures> = (<
	TRow extends object,
	TConfigFeatures extends TableFeatures = TFeatures,
>(
	props: BoundDataGridProps<TConfigFeatures, TRow>,
) => ReactElement | null) &
	DataGridStatics

/**
 * The bundle returned by {@link createDataGrid}: the bound compound `DataGrid`, the
 * hooks, the components provider, cell-type-aware column helpers, and `extendDataGrid`
 * — a re-invocation of the factory that reuses the same `components` while merging in
 * extra cell types (return typed to the merged key union).
 *
 * `TFeatures` is `undefined` unless the factory was given a `features` set. That is the whole
 * difference between the two bundles: with a set bound, `DataGrid` and `useDataGrid` stop
 * demanding one at every call site and start carrying it out in their return type; without,
 * both are exactly the unbound hook and component, `features` required as core declares it.
 * The parameter defaults to `undefined` so `DataGridBundle<KitCellTypes>` keeps its meaning.
 */
export type DataGridBundle<
	TCellTypes extends CellTypeRegistry,
	TFeatures extends TableFeatures | undefined = undefined,
> = {
	DataGrid: TFeatures extends TableFeatures ? BoundDataGrid<TFeatures> : typeof DataGrid
	useDataGrid: TFeatures extends TableFeatures
		? <TRow extends object, TConfigFeatures extends TableFeatures = TFeatures>(
				config: BoundUseDataGridConfig<TConfigFeatures, TRow>,
			) => DataTable<TConfigFeatures, TRow>
		: typeof useDataGrid
	useDataGridState: typeof useDataGridState
	GridComponentsProvider: typeof GridComponentsProvider
	createColumns: <TRow extends object>(defs: ColumnDef<TRow, TCellTypes>[]) => ColumnDef<TRow, TCellTypes>[]
	createColumnHelper: <TRow extends object>() => ColumnHelper<TRow, TCellTypes>
	extendDataGrid: <TExtra extends CellTypeRegistry>(
		extraCellTypes: TExtra,
	) => DataGridBundle<TCellTypes & TExtra, TFeatures>
}

/**
 * Factory for creating a typed DataGrid bundle pre-configured with UI components
 * and optional cell types. Returns a `createColumns` helper typed to the registered
 * custom cell type keys so `type: 'my-type'` on columns is type-safe.
 *
 * This package contains **zero visual styling** — every visible primitive is
 * supplied via `components`. Pair with `import '@ez-kit/data-grid-react/styles.css'`
 * once at the kit / app root to apply the shared structural CSS
 * (positioning, layout, overflow, z-index, cursor). Visuals stay in the kit.
 *
 * @example
 * // With custom cell types
 * export const { DataGrid, useDataGrid, createColumns } = extendDataGrid({
 *   rating: defineCellType<{ max: number }>()({ view: RatingCellView, editing: RatingCellInput }),
 * })
 */
export function createDataGrid<
	TCellTypes extends CellTypeRegistry = CellTypeRegistry,
	TFeatures extends TableFeatures | undefined = undefined,
>({
	components,
	cellTypes,
	features,
	defaults,
}: CreateDataGridOptions<TCellTypes, TFeatures>): DataGridBundle<TCellTypes, TFeatures> {
	/*
	 * `features` is folded into the defaults layer rather than carried separately: the layer
	 * merge already treats it correctly — `mergeOptionLayers` replaces `features` wholesale
	 * instead of deep-merging it — so the instance config still wins, and a grid that narrows
	 * below the bundle's set gets the narrow set rather than the union of the two. Lifting it to
	 * its own field is a *typing* decision (it is the one option every instance config must
	 * name); the runtime has one layer stack, not two.
	 */
	const factoryDefaults: DataGridDefaultOptions<GridFeatures, object> | undefined =
		features === undefined ? defaults : { ...defaults, features }

	type BoundProps = Parameters<typeof DataGrid>[0]
	function BoundDataGrid(props: BoundProps) {
		return (
			<GridComponentsProvider components={components}>
				{/*
				 * The uncontrolled form runs `useDataGrid` inside `<DataGrid>`, out of reach of the
				 * bound hook below, so the factory layer is published here as well. It is a context of
				 * its own rather than a `DataGridOptionsProvider`: this provider sits *inside* whatever
				 * the consumer put around the grid, and an app-level `DataGridOptionsProvider` must
				 * outrank the kit's defaults, not the other way round.
				 */}
				<GridFactoryDefaultsProvider defaults={factoryDefaults}>
					{cellTypes != null ? (
						<CellTypesProvider cellTypes={cellTypes}>
							<DataGrid {...props} />
						</CellTypesProvider>
					) : (
						<DataGrid {...props} />
					)}
				</GridFactoryDefaultsProvider>
			</GridComponentsProvider>
		)
	}
	// Copy the whole compound namespace rather than listing members by hand. The hand-written
	// list had silently fallen five members behind `DataGrid` (SelectionBar, DraftBar,
	// SortMenuTrigger, GlobalFilterInput, VisibilityTrigger), and the `as typeof DataGrid`
	// cast below hid it from the type checker — so `<DataGrid.SelectionBar />` from a kit was
	// `undefined` at runtime with no compile error. Assigning the namespace wholesale makes
	// that class of drift impossible.
	Object.assign(BoundDataGrid, DataGrid)

	function boundDefineColumns<TRow extends object>(defs: ColumnDef<TRow, TCellTypes>[]): ColumnDef<TRow, TCellTypes>[] {
		return defs
	}

	function boundCreateColumnHelper<TRow extends object>(): ColumnHelper<TRow, TCellTypes> {
		const ids = Object.keys(cellTypes ?? {}) as KitCellTypeId<TCellTypes>[]
		// No registry at all: fall back to the base contract's ids, so a bundle built without
		// `cellTypes` still answers to `.text()` / `.select()` rather than to nothing.
		return ids.length > 0
			? createColumnHelper<TRow, TCellTypes>(ids)
			: (createColumnHelper<TRow>() as unknown as ColumnHelper<TRow, TCellTypes>)
	}

	// Bind the kit-level `defaults` as the base option layer for every call. `BoundDataGrid`
	// publishes the same layer to its own subtree, which is what the uncontrolled form reads;
	// this hook covers the controlled form, where `useDataGrid` runs in the *consumer's* tree —
	// outside that provider — because the caller builds the instance before handing it to
	// `<DataGrid table={…} />`.
	//
	// A defaults-less bundle passes `undefined`, which lets the hook fall back to an ambient
	// factory layer — reachable only from inside another bound grid, and the shared core closes
	// that layer off before any child renders, so the fallback never picks up a foreign kit's.
	function useDataGridWithDefaults<TConfigFeatures extends TableFeatures, TRow extends object>(
		config: UseDataGridConfig<TConfigFeatures, TRow>,
	): DataTable<TConfigFeatures, TRow> {
		return useDataGrid<TConfigFeatures, TRow>(
			config,
			factoryDefaults as DataGridDefaultOptions<TConfigFeatures, TRow> | undefined,
		)
	}

	function boundExtendDataGrid<TExtra extends CellTypeRegistry>(
		extraCellTypes: TExtra,
	): DataGridBundle<TCellTypes & TExtra, TFeatures> {
		const mergedCellTypes = mergeCellTypes(cellTypes ?? {}, extraCellTypes) as TCellTypes & TExtra
		return createDataGrid<TCellTypes & TExtra, TFeatures>({
			components,
			cellTypes: mergedCellTypes,
			...(features !== undefined ? { features } : {}),
			...(defaults !== undefined ? { defaults } : {}),
		})
	}

	/*
	 * The two feature-carrying members are asserted rather than inferred, because their declared
	 * types are *conditional* on `TFeatures` and TypeScript cannot check an assignment against an
	 * unresolved conditional — `TFeatures` is still a type parameter here. Neither assertion hides
	 * a shape difference: the relaxed types differ from the unbound ones only in that `features`
	 * is optional, and the runtime is the same function and the same component in both cases,
	 * since binding happens through the defaults layer rather than by swapping implementations.
	 */
	return {
		DataGrid: BoundDataGrid as unknown as DataGridBundle<TCellTypes, TFeatures>['DataGrid'],
		useDataGrid: useDataGridWithDefaults as DataGridBundle<TCellTypes, TFeatures>['useDataGrid'],
		useDataGridState,
		GridComponentsProvider,
		createColumns: boundDefineColumns,
		createColumnHelper: boundCreateColumnHelper,
		extendDataGrid: boundExtendDataGrid,
	}
}
