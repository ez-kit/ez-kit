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
				systemColumnType: 'selection',
				columnPinning: { pin: 'left' },
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
				systemColumnType: 'expand',
			},
		})
	}

	result.push(...userColumns)

	const needsActions = opts.editing || opts.deleting || opts.pinning
	if (needsActions) {
		result.push({
			id: ACTIONS_COLUMN_ID,
			header: () => null,
			cell: () => null,
			size: getActionsColumnSize({
				editing: opts.editing,
				deleting: opts.deleting,
				pinning: opts.pinning,
				variant: opts.rowActionsVariant ?? RowActionsVariant.Inline,
			}),
			enableSorting: false,
			enableColumnFilter: false,
			meta: {
				isSystemColumn: true,
				systemColumnType: 'actions',
				columnPinning: { pin: 'right' },
			},
		})
	}

	return result
}

/**
 * Extracts initial column pinning state from column defs.
 * Called before passing columns to TanStack so that
 * columns with `meta.columnPinning.pin` or `meta.columnPinning.initialPin`
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
		const position = pinDef.pin ?? pinDef.initialPin
		const colId = col.id ?? (col as { accessorKey?: string }).accessorKey ?? undefined
		if (!position || !colId) continue
		if (position === 'left') left.push(colId)
		else right.push(colId)
	}

	return { left, right }
}
