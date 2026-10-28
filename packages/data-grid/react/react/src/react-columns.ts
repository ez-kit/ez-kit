import {
	createColumnHelper as createCoreColumnHelper,
	createColumns as createCoreColumns,
} from '@ez-kit/data-grid-core'

import type { CellTypeRegistry } from './cell-types-context'
import type {
	BaseCellTypes,
	ColumnDef as CoreColumnDef,
	ColumnHelper as CoreColumnHelper,
	CellDef as CoreCellDef,
	ColumnConfigShape,
	UncheckedColumnConfig,
} from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

/**
 * A column definition whose renderer slots are bound to React.
 *
 * Core carries `header`, `footer`, `cell.component`, `filtering.component`, `editing.component`
 * and `creating.component` with an open `TNode`, because it is framework-agnostic and never
 * calls them. Binding `TNode` to `ReactNode` here type-checks what those renderers return and
 * restores autocomplete inside them — the same trick `ReactExpandingConfig` already uses for
 * `expanding.component`, and for the same reason: a hand-written React twin of the whole column def
 * could only ever drift out of sync with core.
 *
 * A React column stays assignable to `TableConfig['columns']`, since a renderer returning
 * `ReactNode` is a renderer returning `unknown`.
 */
export type ColumnDef<
	TRow extends object,
	TCellTypes extends CellTypeRegistry = BaseCellTypes,
	TColumnConfig extends ColumnConfigShape = UncheckedColumnConfig,
> = CoreColumnDef<TRow, TCellTypes, ReactNode, TColumnConfig>

/** {@link ColumnDef}'s cell slot, bound to React. */
export type CellDef<
	TRow extends object,
	TValue = unknown,
	TCellTypes extends CellTypeRegistry = BaseCellTypes,
> = CoreCellDef<TRow, TValue, TCellTypes, ReactNode>

/** The builder returned by {@link createColumnHelper}, bound to React. */
export type ColumnHelper<
	TRow extends object,
	TCellTypes extends CellTypeRegistry = BaseCellTypes,
	TColumnConfig extends ColumnConfigShape = UncheckedColumnConfig,
> = CoreColumnHelper<TRow, TCellTypes, ReactNode, TColumnConfig>

/**
 * Typed identity helper for React columns — the core one with `TNode` bound, so a `header` or
 * `cell.component` returning the wrong thing is a compile error rather than an `unknown`.
 */
export function createColumns<
	TRow extends object,
	TCellTypes extends CellTypeRegistry = BaseCellTypes,
	TColumnConfig extends ColumnConfigShape = UncheckedColumnConfig,
>(defs: ColumnDef<TRow, TCellTypes, TColumnConfig>[]): ColumnDef<TRow, TCellTypes, TColumnConfig>[] {
	return createCoreColumns<TRow, TCellTypes, ReactNode, TColumnConfig>(defs)
}

/** {@link createColumnHelper} with `TNode` bound to React. */
export function createColumnHelper<
	TRow extends object,
	TCellTypes extends CellTypeRegistry = BaseCellTypes,
	TColumnConfig extends ColumnConfigShape = UncheckedColumnConfig,
>(cellTypeIds?: readonly (keyof TCellTypes & string)[]): ColumnHelper<TRow, TCellTypes, TColumnConfig> {
	return createCoreColumnHelper<TRow, TCellTypes, ReactNode, TColumnConfig>(cellTypeIds)
}
