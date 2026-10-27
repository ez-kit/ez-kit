'use client'

import { CellTypesProvider } from './cell-types-context'
import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { DndBundleProvider } from './data-grid/dnd'
import { KeyboardNavigationProvider } from './data-grid/keyboard-navigation'
import { useDataGridState } from './data-grid/table-context'
import { GridFactoryDefaultsProvider } from './data-grid-options-context'
import { useGridContext } from './grid-context'
import { createColumnHelper } from './react-columns'
import { useDataGrid } from './use-data-grid'

import type { CellTypeRegistry } from './cell-types-context'
import type { GridComponents } from './contract'
import type { DataGridControlledProps, DataGridSharedProps, DataGridStatics } from './data-grid/data-grid'
import type { DndAdapter } from './data-grid/dnd'
import type { DataGridDefaultOptions } from './data-grid-options-context'
import type { GridContextReader, GridContextRecord } from './grid-context'
import type { ColumnDef, ColumnHelper } from './react-columns'
import type { DataTable, GridFeatures } from './types'
import type { UseDataGridConfig } from './use-data-grid'
import type { ColumnDef as CoreColumnDef, OperatorsConfig } from '@ez-kit/data-grid-core'
import type { TableFeatures } from '@tanstack/table-core'

/** The ids a registry actually holds, as a string union — what the runtime helper is built from. */
type KitCellTypeId<TCellTypes extends CellTypeRegistry> = Extract<keyof TCellTypes, string>

export type CreateDataGridOptions<
	TCellTypes extends CellTypeRegistry,
	TFeatures extends TableFeatures | undefined = undefined,
	TContext extends object | undefined = undefined,
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
	 * `undefined` default, which collapses this field to `features?: undefined` and **rejects**
	 * the set — `TS2322`, not a silent loss. Pass no type arguments and let both infer, or name
	 * both. The same goes for annotating the result `DataGridBundle<TCellTypes>`: the binding is
	 * dropped by the annotation and the compiler says so at the first call site.
	 */
	features?: TFeatures
	/**
	 * The filter operators every grid from this bundle offers, by cell type — see
	 * {@link OperatorsConfig}. A bundle decision like {@link features}, and named here for the same
	 * reason: it is what the bundle brings, so it belongs in the factory's signature.
	 *
	 * Without it the bundle has **no** operators: `filtering.operators: true` then leaves every
	 * column a plain filter, and warns once in development. The kits' prebuilt `DataGrid` passes the
	 * ready-made `defaultOperators` from `@ez-kit/data-grid-core/operators`; a composed bundle names
	 * it, or a set of its own, here.
	 *
	 * It switches nothing on, and it is not threaded through the types: a set does not narrow what a
	 * grid's config may say. At runtime it is the factory option layer, beneath a provider's
	 * `operators` and the grid's own — a layer replaces the set of each cell type it names and keeps
	 * the rest.
	 */
	operators?: OperatorsConfig | undefined
	/**
	 * Whether this kit wants the package's own keyboard focus model — one tab stop for the whole
	 * grid, arrows between cells, `Enter` into a cell's controls and `Escape` back out, with the
	 * `grid` / `row` / `gridcell` roles that go with it.
	 *
	 * **A statement by the kit, not an option of the grid, and that distinction is the whole
	 * design.** A kit built on React Aria (heroui) already has a roving focus manager; a second
	 * one would fight it for the arrow keys. Were this a field of the grid config instead,
	 * `keyboard: false` would change nothing at all in that kit — an option that type-checks
	 * clean and silently does nothing, which is the defect class `REQUIRED_FEATURE` already
	 * warns about for unregistered features. So it sits here, beside `components` and
	 * `features`, where it reads as what it is: what this bundle brings.
	 *
	 * Default `false`, so a bundle that says nothing renders exactly the DOM it did before.
	 *
	 * Note it is a property of the **bundle**, so a consumer composing their own with
	 * `createDataGrid` decides for themselves — which is also the escape hatch for an
	 * application that needs the model off. A per-grid switch can be added later without a
	 * break, once there is a consumer asking for one.
	 */
	keyboardNavigation?: boolean
	/**
	 * The drag-and-drop adapter every grid from this bundle runs on.
	 *
	 * A statement by the bundle, beside {@link CreateDataGridOptions.keyboardNavigation} and for the
	 * same reason: the mechanics are the kit's, not the grid's. This is the **only** way drag is
	 * switched on — there is no `<DataGrid dnd>` prop and no `dnd` field on the grid config, so the
	 * kit roots stay byte-identical for every consumer who never asked for it.
	 *
	 * Omitted, a grid renders exactly the DOM it did before: no handle, `useDndEnabled()` false, and
	 * `useSortableItem` on an inert handle.
	 *
	 * **A kit package must not pass this in its own `createDataGrid` call.** A kit root is a
	 * prebuilt grid compiled once and shipped to everyone, so an adapter named there drags the drag
	 * library into every consumer's bundle and makes an optional peer a required install. The
	 * adapter ships from the kit's own `/dnd` subpath and a consumer names it themselves;
	 * `apps/docs/test/tree-shaking.test.ts` asserts no drag library is reachable from a kit root.
	 *
	 * Explicitly `| undefined`, unlike its neighbours above, and for a reason specific to this
	 * field: under `exactOptionalPropertyTypes` a bare `dnd?: DndAdapter` rejects
	 * `dnd: flagOn ? adapter : undefined`, and drag behind a feature flag or an environment check
	 * is the ordinary way to write this — where `components` and `features` are not. Passing
	 * `undefined` means the same as omitting it: no adapter, `useDndEnabled()` false.
	 */
	dnd?: DndAdapter | undefined
	/**
	 * The grid context every grid from this bundle starts from — and the **source of its type**.
	 *
	 * The type is inferred from this value, so it is written once, as data: the bundle's
	 * `useGridContext` reads it with every key present (the default guarantees each one), and the
	 * bundle's `DataGrid` / `useDataGrid` take a `Partial` of it, so a grid overrides only the keys
	 * it names. A key outside the type, or of the wrong type, is a compile error at the call site.
	 * Two bundles in one program carry two unrelated contexts.
	 *
	 * At runtime it is the factory option layer, like {@link defaults}: factory <
	 * `DataGridOptionsProvider` < the instance's own `context`, deep-merged — nested plain objects
	 * key by key, anything else replaced whole.
	 *
	 * The same trap as {@link features}: TypeScript has no partial type-argument inference, so an
	 * explicit `createDataGrid<MyCellTypes, MyFeatures>({ … })` leaves `TContext` at its
	 * `undefined` default and rejects this field. Pass no type arguments, or name all three.
	 *
	 * The constraint is `object` rather than `Record<string, unknown>` so an `interface` without
	 * an index signature is accepted as the type.
	 */
	context?: TContext
	/**
	 * Kit-level default grid options baked into the bundle. Merged as the **base** layer
	 * under an app-level `DataGridOptionsProvider` and the per-call config
	 * (factory `defaults` < provider `defaults` < instance config). Lets a kit ship
	 * opinionated defaults (e.g. `{ sorting: true, visibility: true }`) so consumers
	 * need not repeat them at every `useDataGrid` call site.
	 *
	 * `context` is not accepted here: {@link context} is the factory's one entry point for it,
	 * because it is the one that types the bundle.
	 */
	defaults?: Omit<DataGridDefaultOptions<GridFeatures, object>, 'context'>
}

/**
 * The registry a public bundle type checks `cell` against when none is named: one that accepts
 * any `cell`, which is what `TableConfig.columns` itself does. It keeps a wrapper written as
 * `BoundDataGridProps<F, Row>` — one that does not know the registry it forwards to — exactly as
 * permissive as it was before the parameter existed. A bundle names its own registry explicitly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UncheckedCellTypes = any

/** The registry a grid adds when it passes no `cellTypes` of its own: nothing. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- an empty registry, by definition
export type NoExtraCellTypes = {}

/**
 * {@link UseDataGridConfig} with `columns` checked against a registry: the bundle's `TCellTypes`,
 * widened by the `cellTypes` this grid passes itself.
 *
 * `NoInfer` is what makes the per-grid registry the only way to widen it. Without it TypeScript
 * infers `TExtra` from the columns as well as from `cellTypes`, so a column naming an id nobody
 * registered would register it — and compile. With it, `TExtra` comes from `cellTypes` alone and
 * defaults to {@link NoExtraCellTypes} when the grid passes none. See ADR 0016.
 */
export type RegistryUseDataGridConfig<
	TFeatures extends TableFeatures,
	TRow extends object,
	TContext extends object = GridContextRecord,
	TCellTypes extends CellTypeRegistry = UncheckedCellTypes,
	TExtra extends CellTypeRegistry = NoExtraCellTypes,
> = Omit<UseDataGridConfig<TFeatures, TRow, TContext>, 'columns' | 'cellTypes'> & {
	/**
	 * Columns, checked against the bundle's registry and this grid's `cellTypes`. The node type
	 * stays `unknown`, as on `TableConfig.columns`, so columns from core's own `createColumns`
	 * keep fitting.
	 */
	columns: CoreColumnDef<TRow, TCellTypes & NoInfer<TExtra>>[]
	/** Custom cell types for this grid alone, merged over the bundle's. Their ids become valid `cell.type`s here. */
	cellTypes?: TExtra
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
export type BoundUseDataGridConfig<
	TFeatures extends TableFeatures,
	TRow extends object,
	TContext extends object = GridContextRecord,
	TCellTypes extends CellTypeRegistry = UncheckedCellTypes,
	TExtra extends CellTypeRegistry = NoExtraCellTypes,
> = Omit<RegistryUseDataGridConfig<TFeatures, TRow, TContext, TCellTypes, TExtra>, 'features'> & {
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
export type BoundDataGridProps<
	TFeatures extends TableFeatures,
	TRow extends object,
	TContext extends object = GridContextRecord,
	TCellTypes extends CellTypeRegistry = UncheckedCellTypes,
	TExtra extends CellTypeRegistry = NoExtraCellTypes,
> =
	| DataGridControlledProps<TFeatures, TRow>
	| (DataGridSharedProps & BoundUseDataGridConfig<TFeatures, TRow, TContext, TCellTypes, TExtra> & { table?: never })

/** `DataGridProps` with `columns` checked the same way as {@link RegistryUseDataGridConfig}. */
export type RegistryDataGridProps<
	TFeatures extends TableFeatures,
	TRow extends object,
	TContext extends object = GridContextRecord,
	TCellTypes extends CellTypeRegistry = UncheckedCellTypes,
	TExtra extends CellTypeRegistry = NoExtraCellTypes,
> =
	| DataGridControlledProps<TFeatures, TRow>
	| (DataGridSharedProps & RegistryUseDataGridConfig<TFeatures, TRow, TContext, TCellTypes, TExtra> & { table?: never })

/**
 * The compound `DataGrid` a feature-bound bundle hands back: the relaxed call signature, and
 * the identical namespace — {@link DataGridStatics} rather than a second copy of twenty-eight
 * members that would then drift from the first.
 */
export type BoundDataGrid<
	TFeatures extends TableFeatures,
	TContext extends object = GridContextRecord,
	TCellTypes extends CellTypeRegistry = UncheckedCellTypes,
> = (<
	TRow extends object,
	TConfigFeatures extends TableFeatures = TFeatures,
	TExtra extends CellTypeRegistry = NoExtraCellTypes,
>(
	props: BoundDataGridProps<TConfigFeatures, TRow, TContext, TCellTypes, TExtra>,
) => ReturnType<typeof DataGrid>) &
	DataGridStatics

/** The `useDataGrid` counterpart of {@link BoundDataGrid}. */
export type BoundUseDataGrid<
	TFeatures extends TableFeatures,
	TContext extends object = GridContextRecord,
	TCellTypes extends CellTypeRegistry = UncheckedCellTypes,
> = <
	TRow extends object,
	TConfigFeatures extends TableFeatures = TFeatures,
	TExtra extends CellTypeRegistry = NoExtraCellTypes,
>(
	config: BoundUseDataGridConfig<TConfigFeatures, TRow, TContext, TCellTypes, TExtra>,
) => DataTable<TConfigFeatures, TRow>

/**
 * The compound `DataGrid` a bundle with no feature set hands back: the unbound call signature —
 * `features` still required — with `context` typed as `TContext` and `columns` checked against
 * the bundle's registry. A bundle with neither a set nor a context gets it too, at
 * {@link GridContextRecord}: the registry is the one thing every bundle carries.
 */
export type ContextBoundDataGrid<TContext extends object, TCellTypes extends CellTypeRegistry = UncheckedCellTypes> = (<
	TFeatures extends TableFeatures,
	TRow extends object,
	TExtra extends CellTypeRegistry = NoExtraCellTypes,
>(
	props: RegistryDataGridProps<TFeatures, TRow, TContext, TCellTypes, TExtra>,
) => ReturnType<typeof DataGrid>) &
	DataGridStatics

/** The `useDataGrid` counterpart of {@link ContextBoundDataGrid}. */
export type ContextBoundUseDataGrid<
	TContext extends object,
	TCellTypes extends CellTypeRegistry = UncheckedCellTypes,
> = <TFeatures extends TableFeatures, TRow extends object, TExtra extends CellTypeRegistry = NoExtraCellTypes>(
	config: RegistryUseDataGridConfig<TFeatures, TRow, TContext, TCellTypes, TExtra>,
) => DataTable<TFeatures, TRow>

/**
 * The context type a bundle's reader returns: the factory default's type when one was given,
 * {@link GridContextRecord} otherwise. Tuple-wrapped so a union context is not distributed.
 */
type BundleContext<TContext extends object | undefined> = [TContext] extends [object] ? TContext : GridContextRecord

/**
 * The `context` a grid from the bundle accepts: a `Partial` of the factory default's type, since
 * the default already supplies every key — and the untyped {@link GridContextRecord}, unchanged,
 * when the factory set none.
 */
type InstanceContext<TContext extends object | undefined> = [TContext] extends [object]
	? Partial<TContext>
	: GridContextRecord

/**
 * The bundle returned by {@link createDataGrid}: the bound compound `DataGrid`, the
 * hooks, the components provider, and cell-type-aware column helpers.
 *
 * `TFeatures` is `undefined` unless the factory was given a `features` set. That is the whole
 * difference between the two bundles: with a set bound, `DataGrid` and `useDataGrid` stop
 * demanding one at every call site and start carrying it out in their return type; without,
 * both are exactly the unbound hook and component, `features` required as core declares it.
 * The parameter defaults to `undefined` so `DataGridBundle<KitCellTypes>` keeps its meaning.
 *
 * `TContext` works the same way for the factory `context`: `undefined` unless one was given,
 * and then `DataGrid` / `useDataGrid` take `context` as a `Partial` of it and `useGridContext`
 * reads it complete. Left at `undefined`, both members are exactly the types they were before
 * the parameter existed, which is what keeps `DataGridBundle<KitCellTypes, KitFeatures>` meaning
 * the same thing.
 */
export type DataGridBundle<
	TCellTypes extends CellTypeRegistry,
	TFeatures extends TableFeatures | undefined = undefined,
	TContext extends object | undefined = undefined,
> = {
	DataGrid: TFeatures extends TableFeatures
		? BoundDataGrid<TFeatures, InstanceContext<TContext>, TCellTypes>
		: ContextBoundDataGrid<InstanceContext<TContext>, TCellTypes>
	useDataGrid: TFeatures extends TableFeatures
		? BoundUseDataGrid<TFeatures, InstanceContext<TContext>, TCellTypes>
		: ContextBoundUseDataGrid<InstanceContext<TContext>, TCellTypes>
	/**
	 * Reads the grid context as this bundle's type — the factory default's, complete, when the
	 * factory was given one; {@link GridContextRecord} otherwise. The package's own
	 * `useGridContext` at runtime, typed here rather than per call.
	 */
	useGridContext: GridContextReader<BundleContext<TContext>>
	useDataGridState: typeof useDataGridState
	GridComponentsProvider: typeof GridComponentsProvider
	createColumns: <TRow extends object>(defs: ColumnDef<TRow, TCellTypes>[]) => ColumnDef<TRow, TCellTypes>[]
	createColumnHelper: <TRow extends object>() => ColumnHelper<TRow, TCellTypes>
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
 * export const { DataGrid, useDataGrid, createColumns } = createDataGrid({
 *   components: allComponents,
 *   features: allDataGridFeatures,
 *   cellTypes: {
 *     ...cellTypes,
 *     rating: defineCellType<{ max: number }>()({ view: RatingCellView, editing: RatingCellInput }),
 *   },
 * })
 */
export function createDataGrid<
	TCellTypes extends CellTypeRegistry = CellTypeRegistry,
	TFeatures extends TableFeatures | undefined = undefined,
	TContext extends object | undefined = undefined,
>({
	components,
	cellTypes,
	features,
	operators,
	context,
	defaults,
	dnd,
	keyboardNavigation = false,
}: CreateDataGridOptions<TCellTypes, TFeatures, TContext>): DataGridBundle<TCellTypes, TFeatures, TContext> {
	/*
	 * `features` is folded into the defaults layer rather than carried separately: the layer
	 * merge already treats it correctly — `mergeOptionLayers` replaces `features` wholesale
	 * instead of deep-merging it — so the instance config still wins, and a grid that narrows
	 * below the bundle's set gets the narrow set rather than the union of the two. Lifting it to
	 * its own field is a *typing* decision (it is the one option every instance config must
	 * name); the runtime has one layer stack, not two.
	 *
	 * `operators` and `context` are folded in the same way, and take the ordinary merge: a layer
	 * above replaces the operator set of each cell type it names and keeps the rest, and the
	 * context's own field is where the bundle's type comes from. The cast is the
	 * constraint's: `TContext extends object` admits an `interface` that `GridContextRecord`'s
	 * index signature does not, and the layer stack is row- and context-erased throughout.
	 */
	const factoryDefaults: DataGridDefaultOptions<GridFeatures, object> | undefined =
		features === undefined && operators === undefined && context === undefined
			? defaults
			: {
					...defaults,
					...(features !== undefined ? { features } : {}),
					...(operators !== undefined ? { operators } : {}),
					...(context !== undefined ? { context: context as GridContextRecord } : {}),
				}

	type BoundProps = Parameters<typeof DataGrid>[0]
	function BoundDataGrid(props: BoundProps) {
		return (
			// The bundle's adapter, published for the grid root below to promote to its own layer
			// and then close off. Outermost, because it is the outermost fact: what this bundle was
			// built with, before anything about one grid.
			<DndBundleProvider adapter={dnd ?? null}>
				<KeyboardNavigationProvider enabled={keyboardNavigation}>
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
				</KeyboardNavigationProvider>
			</DndBundleProvider>
		)
	}
	// Copy the whole compound namespace rather than listing members by hand. The hand-written
	// list had silently fallen five members behind `DataGrid` (ActionBar, BottomBar,
	// SortMenuTrigger, GlobalFilterInput, VisibilityTrigger), and the `as typeof DataGrid`
	// cast below hid it from the type checker — so `<DataGrid.ActionBar />` from a kit was
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
			// The controlled form runs this in the consumer's tree, outside `DndBundleProvider`, so
			// the adapter is handed over the way the defaults are.
			dnd ?? null,
		)
	}

	/*
	 * The two feature-carrying members are asserted rather than inferred, because their declared
	 * types are *conditional* on `TFeatures` and TypeScript cannot check an assignment against an
	 * unresolved conditional — `TFeatures` is still a type parameter here.
	 *
	 * Both are plain `as`, deliberately: an `as unknown as` here would compile whatever the
	 * relaxed types happened to say, and it did hide something real — `BoundDataGrid` was
	 * declared `=> ReactElement | null` against `DataGridRoot`'s inferred `=> Element`, which
	 * made `DataGridBundle<C, F>` unassignable to `DataGridBundle<C>` for a reason nobody
	 * intended. Naming `ReturnType<typeof DataGrid>` on the signature is what keeps the two in
	 * step; the single hop then checks, and the relaxed types differ from the unbound ones only
	 * in that `features` is optional.
	 */
	return {
		DataGrid: BoundDataGrid as DataGridBundle<TCellTypes, TFeatures, TContext>['DataGrid'],
		useDataGrid: useDataGridWithDefaults as DataGridBundle<TCellTypes, TFeatures, TContext>['useDataGrid'],
		useGridContext: useGridContext as DataGridBundle<TCellTypes, TFeatures, TContext>['useGridContext'],
		useDataGridState,
		GridComponentsProvider,
		createColumns: boundDefineColumns,
		createColumnHelper: boundCreateColumnHelper,
	}
}
