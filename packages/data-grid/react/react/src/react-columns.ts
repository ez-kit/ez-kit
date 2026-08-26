import {
	createColumnHelper as createCoreColumnHelper,
	createColumns as createCoreColumns,
} from '@ez-kit/data-grid-core'

import type {
	ColumnDef as CoreColumnDef,
	ColumnHelper as CoreColumnHelper,
	CellDef as CoreCellDef,
} from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

/**
 * A column definition whose renderer slots are bound to React.
 *
 * Core carries `header`, `footer`, `cell.component`, `filtering.component`, `editing.component`
 * and `creating.component` with an open `TNode`, because it is framework-agnostic and never
 * calls them. Binding `TNode` to `ReactNode` here type-checks what those renderers return and
 * restores autocomplete inside them — the same trick `ReactExpandingConfig` already uses for
 * `renderExpanded`, and for the same reason: a hand-written React twin of the whole column def
 * could only ever drift out of sync with core.
 *
 * A React column stays assignable to `TableConfig['columns']`, since a renderer returning
 * `ReactNode` is a renderer returning `unknown`.
 */
export type ColumnDef<TRow extends object, TCustomCellTypes extends string = never> = CoreColumnDef<
	TRow,
	TCustomCellTypes,
	ReactNode
>

/** {@link ColumnDef}'s cell slot, bound to React. */
export type CellDef<TRow extends object, TValue = unknown, TCustomCellTypes extends string = never> = CoreCellDef<
	TRow,
	TValue,
	TCustomCellTypes,
	ReactNode
>

/** The builder returned by {@link createColumnHelper}, bound to React. */
export type ColumnHelper<TRow extends object, TCustomCellTypes extends string = never> = CoreColumnHelper<
	TRow,
	TCustomCellTypes,
	ReactNode
>

/**
 * Typed identity helper for React columns — the core one with `TNode` bound, so a `header` or
 * `cell.component` returning the wrong thing is a compile error rather than an `unknown`.
 */
export function createColumns<TRow extends object, TCustomCellTypes extends string = never>(
	defs: ColumnDef<TRow, TCustomCellTypes>[],
): ColumnDef<TRow, TCustomCellTypes>[] {
	return createCoreColumns<TRow, TCustomCellTypes, ReactNode>(defs)
}

/** {@link createColumnHelper} with `TNode` bound to React. */
export function createColumnHelper<TRow extends object, TCustomCellTypes extends string = never>(
	customTypes?: TCustomCellTypes[],
): ColumnHelper<TRow, TCustomCellTypes> {
	return createCoreColumnHelper<TRow, TCustomCellTypes, ReactNode>(customTypes)
}
