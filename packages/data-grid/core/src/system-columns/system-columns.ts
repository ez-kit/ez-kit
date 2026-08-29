import { ColumnPinSide, SystemColumnType } from '../column/types'
import { getActionsColumnSize, RowActionsVariant } from '../features/row-actions'

import type { TanStackColumnDef } from '../column/types'

/** Identifier constants for auto-injected system columns. */
export const SELECTION_COLUMN_ID = '__selection__'
export const EXPAND_COLUMN_ID = '__expand__'
export const ACTIONS_COLUMN_ID = '__actions__'

type SystemColumnsOptions = {
	selection: boolean
	expanding: boolean
	editing: boolean
	deleting: boolean
	/** Row pinning — its menu lives in the actions column alongside edit / delete. */
	pinning: boolean
	/** Defaults to {@link RowActionsVariant.Inline}. */
	rowActionsVariant?: RowActionsVariant
	/**
	 * Whether `rowActions.actions` was supplied.
	 *
	 * Required, like `editing` / `deleting` / `pinning` and unlike `rowActionsVariant?`: those
	 * three decide whether the column exists at all and this is a fourth such feature — a grid
	 * whose only per-row action is a custom one still needs the column, and its entries still
	 * need the overflow trigger's width reserved. `rowActionsVariant` has an honest default
	 * (Inline); "does the consumer supply actions?" has none, and silently defaulting it to
	 * false is exactly how the option went missing before.
	 */
	customRowActions: boolean
}

/**
 * Builds the final column list:
 * [__selection__, __expand__, ...user columns, __actions__]
 *
 * System columns contain no cell renderers (framework-agnostic stubs).
 * The React layer renders them based on meta.systemColumnType.
 *
 * Row pinning has no column of its own: its menu is one more action in the
 * `__actions__` cell, so a pinning-only grid still gets that column.
 */
export function buildColumnList<TRow extends object>(
	userColumns: TanStackColumnDef<TRow>[],
	opts: SystemColumnsOptions,
): TanStackColumnDef<TRow>[] {
	const result: TanStackColumnDef<TRow>[] = []

	if (opts.selection) {
		result.push({
			id: SELECTION_COLUMN_ID,
			header: () => null,
			cell: () => null,
			size: 44,
			enableSorting: false,
			enableColumnFilter: false,
			meta: {
				isSystemColumn: true,
				systemColumnType: SystemColumnType.Selection,
				columnPinning: { side: ColumnPinSide.Left },
			},
		})
	}

	if (opts.expanding) {
		result.push({
			id: EXPAND_COLUMN_ID,
			header: () => null,
			cell: () => null,
			size: 44,
			enableSorting: false,
			enableColumnFilter: false,
			meta: {
				isSystemColumn: true,
				systemColumnType: SystemColumnType.Expand,
			},
		})
	}

	result.push(...userColumns)

	const needsActions = opts.editing || opts.deleting || opts.pinning || opts.customRowActions
	if (needsActions) {
		result.push({
			id: ACTIONS_COLUMN_ID,
			header: () => null,
			cell: () => null,
			size: getActionsColumnSize({
				editing: opts.editing,
				deleting: opts.deleting,
				pinning: opts.pinning,
				custom: opts.customRowActions,
				variant: opts.rowActionsVariant ?? RowActionsVariant.Inline,
			}),
			enableSorting: false,
			enableColumnFilter: false,
			meta: {
				isSystemColumn: true,
				systemColumnType: SystemColumnType.Actions,
				columnPinning: { side: ColumnPinSide.Right },
			},
		})
	}

	return result
}

/**
 * Extracts initial column pinning state from column defs.
 * Called before passing columns to TanStack so that
 * columns with `meta.columnPinning.side` or `meta.columnPinning.initialSide`
 * are registered in initial state.
 */
export function extractPinningState<TRow extends object>(
	columns: TanStackColumnDef<TRow>[],
): { left: string[]; right: string[] } {
	const left: string[] = []
	const right: string[] = []

	for (const col of columns) {
		const pinDef = col.meta?.columnPinning
		if (!pinDef) continue
		const position = pinDef.side ?? pinDef.initialSide
		const colId = col.id ?? (col as { accessorKey?: string }).accessorKey ?? undefined
		if (!position || !colId) continue
		if (position === ColumnPinSide.Left) left.push(colId)
		else right.push(colId)
	}

	return { left, right }
}
