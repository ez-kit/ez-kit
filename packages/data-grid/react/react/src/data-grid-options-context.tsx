import { createContext, useContext, useMemo } from 'react'

import { deepMerge } from './utils/deep-merge'

import type { UseDataGridConfig } from './use-data-grid'
import type { CreatingConfig, DeletingConfig, EditingConfig } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

/**
 * The mergeable subset of {@link UseDataGridConfig} — feature toggles and their config
 * objects (`sorting`, `pagination`, `filtering`, `globalFiltering`, `selection`,
 * `visibility`, `expanding`, `pinning`, `resizing`, `layout`,
 * `fallbacks`, …) that can be supplied once as defaults (app-level `DataGridOptionsProvider`
 * or kit-level `createDataGrid({ defaults })`) and merged **under** each instance's own
 * config.
 *
 * Excludes the per-instance data inputs and controlled-state bindings — `data`, `columns`,
 * `state`, `onStateChange` — which are meaningless as shared application defaults.
 *
 * `creating`, `editing` and `deleting` keep their full shape except for the callback that
 * makes them run: a defaults layer describes *how* a write looks (`mode`, `confirmation`)
 * for every grid in the app, while the grid that supplies `onSave` / `onDelete` is the one
 * that actually gets the feature. A grid left without a handler resolves the feature away
 * rather than rendering a trigger that would throw on commit — see `useDataGrid`.
 */
export type DataGridDefaultOptions<TRow extends object> = Omit<
	UseDataGridConfig<TRow>,
	'data' | 'columns' | 'state' | 'onStateChange' | 'creating' | 'editing' | 'deleting'
> & {
	/**
	 * How create looks. The grid that supplies `onSave` decides whether it exists at all.
	 *
	 * The `boolean` arm is kept, exactly as on every other feature: a defaults layer must be able
	 * to say `creating: false` and switch the feature off for a whole subtree without restating
	 * the settings, which is the same reason the instance config carries it.
	 */
	creating?: boolean | PartialBy<CreatingConfig<TRow>, 'onSave'>
	/** How edit looks. The grid that supplies `onSave` decides whether it exists at all. */
	editing?: boolean | PartialBy<EditingConfig<TRow>, 'onSave'>
	/** How delete looks. The grid that supplies `onDelete` decides whether it exists at all. */
	deleting?: boolean | PartialBy<DeletingConfig<TRow>, 'onDelete'>
}

/** Alias used at the context boundary where the row type is erased (mirrors the cell-type registry). */
type AnyDefaultOptions = DataGridDefaultOptions<object>

/**
 * `TConfig` with `TKey` made optional — relaxes the callbacks that are required on an
 * instance config but cannot be supplied by a shared defaults layer.
 */
type PartialBy<TConfig, TKey extends keyof TConfig> = Omit<TConfig, TKey> & Partial<Pick<TConfig, TKey>>

/** Untyped record view used when handing options to the row-agnostic {@link deepMerge}. */
type OptionsRecord = Record<string, unknown>

const EMPTY_OPTIONS: AnyDefaultOptions = {}

/**
 * Default is **empty** — with no provider and no factory `defaults`, instance config
 * flows through untouched and behaviour is identical to calling `useDataGrid` directly.
 */
const DataGridOptionsContext = createContext<AnyDefaultOptions>(EMPTY_OPTIONS)

export type DataGridOptionsProviderProps<TRow extends object> = {
	/** Default grid options merged under every descendant `useDataGrid` call. */
	defaults: DataGridDefaultOptions<TRow>
	children: ReactNode
}

/**
 * Supplies application-level default grid options to every descendant `useDataGrid` call.
 *
 * Defaults are merged **under** each instance's own config (instance wins) with a per-feature
 * deep merge, so `pagination: true` here plus `pagination: { pageSize: 20 }` at the call site
 * resolve together. Providers nest: a child provider's defaults are deep-merged on top of the
 * parent's, letting a subtree refine app-wide defaults without repeating them.
 */
export function DataGridOptionsProvider<TRow extends object>({
	defaults,
	children,
}: DataGridOptionsProviderProps<TRow>) {
	const parent = useContext(DataGridOptionsContext)
	const merged = useMemo(
		() => deepMerge(parent as OptionsRecord, defaults as OptionsRecord) as AnyDefaultOptions,
		[parent, defaults],
	)
	return <DataGridOptionsContext.Provider value={merged}>{children}</DataGridOptionsContext.Provider>
}

/**
 * Reads the merged default grid options contributed by ancestor {@link DataGridOptionsProvider}s.
 * The context stores options with the row type erased (`object`); the double cast re-applies the
 * caller's `TRow` — safe because defaults are structural feature config, not row-bound values.
 */
export function useDataGridOptions<TRow extends object>(): DataGridDefaultOptions<TRow> {
	return useContext(DataGridOptionsContext) as unknown as DataGridDefaultOptions<TRow>
}

/**
 * Composes the three option layers into the final instance config.
 * Precedence, low → high: factory `defaults` < provider `defaults` < instance `config`.
 * Deep and immutable — nested feature settings combine; instance values win on conflict.
 */
export function mergeGridOptionLayers<TRow extends object>(
	factoryDefaults: DataGridDefaultOptions<TRow> | undefined,
	providerDefaults: DataGridDefaultOptions<TRow>,
	config: UseDataGridConfig<TRow>,
): UseDataGridConfig<TRow> {
	const base = factoryDefaults ? deepMerge(factoryDefaults, providerDefaults) : providerDefaults
	return deepMerge(base, config) as UseDataGridConfig<TRow>
}

/**
 * The **factory** layer, carried through the tree rather than through an argument.
 *
 * `createDataGrid({ defaults })` binds its defaults into the `useDataGrid` it returns, which
 * covers the controlled form (the caller builds the table, then passes it to `<DataGrid table={…} />`).
 * The uncontrolled form runs `useDataGrid` *inside* `<DataGrid>`, where no such argument can
 * reach it — so the bound `DataGrid` also provides them here and the hook picks them up.
 *
 * Deliberately **not** the same context as {@link DataGridOptionsProvider}: an app-level
 * provider must outrank the kit's defaults, so the two layers cannot share one value.
 *
 * `undefined` means "no factory layer". A bare `<DataGrid>` sees that, and so does a grid
 * nested among another grid's children — the shared core re-provides `undefined`, so the layer
 * stops at the grid it configures.
 */
const GridFactoryDefaultsContext = createContext<AnyDefaultOptions | undefined>(undefined)

export type GridFactoryDefaultsProviderProps = {
	/** The kit-level defaults bound by `createDataGrid({ defaults })`. */
	defaults: AnyDefaultOptions | undefined
	children: ReactNode
}

/** Publishes the factory option layer to every `useDataGrid` call inside the bound `<DataGrid>`. */
export function GridFactoryDefaultsProvider({ defaults, children }: GridFactoryDefaultsProviderProps) {
	return <GridFactoryDefaultsContext.Provider value={defaults}>{children}</GridFactoryDefaultsContext.Provider>
}

/**
 * Reads the factory option layer published by a bound `<DataGrid>`. Row type erased at the
 * context boundary and re-applied by the caller, exactly as in {@link useDataGridOptions}.
 */
export function useGridFactoryDefaults<TRow extends object>(): DataGridDefaultOptions<TRow> | undefined {
	return useContext(GridFactoryDefaultsContext) as DataGridDefaultOptions<TRow> | undefined
}
