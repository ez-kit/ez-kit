import type { ColumnConfigShape } from '@ez-kit/data-grid-core'

/**
 * What {@link defineColumnConfig} returns: the bundle's config layers, carried as a type only.
 *
 * The phantom `__columnConfig` is the whole of it — `createDataGrid` never reads the value, so
 * nothing reaches the runtime.
 */
export type ColumnConfigMarker<TColumnConfig extends ColumnConfigShape> = {
	readonly __columnConfig?: TColumnConfig
}

/**
 * Declares the config layers a bundle's columns write — `filtering.config`, `editing.config`,
 * `creating.config` — by the surface they serve. Pass the result as `createDataGrid`'s
 * `columnConfig`, and the bundle's columns, inline and from its builders, are checked against it.
 *
 * A surface left out of `T` stays unchecked: a column may still write a layer there for a
 * `component` of its own, which reads it under whatever type that component names.
 *
 * Declared rather than inferred from the kit's slots for the reason `defineCellType` gives: the
 * renderers that read a layer are several independent inference sites for one type. The call is
 * curried so the type is written while nothing else needs inferring.
 *
 * @example
 * createDataGrid({
 *   components,
 *   columnConfig: defineColumnConfig<{ filtering: { allowsCustomValues?: boolean } }>(),
 * })
 * // → its columns accept `filtering: { config: { allowsCustomValues: true } }`
 */
export function defineColumnConfig<TColumnConfig extends ColumnConfigShape>(): ColumnConfigMarker<TColumnConfig> {
	return {}
}
