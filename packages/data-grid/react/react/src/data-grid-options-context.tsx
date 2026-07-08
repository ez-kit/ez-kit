import { createContext, useContext, useMemo } from 'react'

import { deepMerge } from './utils/deep-merge'

import type { UseDataGridConfig } from './use-data-grid'
import type { ReactNode } from 'react'

/**
 * The mergeable subset of {@link UseDataGridConfig} — feature toggles and their config
 * objects (`sorting`, `pagination`, `filtering`, `globalFiltering`, `selection`,
 * `selectionBar`, `columnVisibility`, `expanding`, `pinning`, `sizing`, `stickyHeader`,
 * `fallbacks`, …) that can be supplied once as defaults (app-level `DataGridOptionsProvider`
 * or kit-level `createDataGrid({ defaultOptions })`) and merged **under** each instance's own
 * config.
 *
 * Excludes the per-instance data inputs and controlled-state bindings — `data`, `columns`,
 * `state`, `onStateChange` — which are meaningless as shared application defaults.
 */
export type DataGridDefaultOptions<TRow extends object> = Omit<
	UseDataGridConfig<TRow>,
	'data' | 'columns' | 'state' | 'onStateChange'
>

/** Alias used at the context boundary where the row type is erased (mirrors the cell-type registry). */
type AnyDefaultOptions = DataGridDefaultOptions<object>

/** Untyped record view used when handing options to the row-agnostic {@link deepMerge}. */
type OptionsRecord = Record<string, unknown>

const EMPTY_OPTIONS: AnyDefaultOptions = {}

/**
 * Default is **empty** — with no provider and no factory `defaultOptions`, instance config
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
	return <DataGridOptionsContext value={merged}>{children}</DataGridOptionsContext>
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
 * Precedence, low → high: factory `defaultOptions` < provider `defaults` < instance `config`.
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
