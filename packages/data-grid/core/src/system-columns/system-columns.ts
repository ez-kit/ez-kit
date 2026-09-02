import { normalizeColumnAlign, normalizeColumnPinning, normalizeColumnWidth } from '../column/normalize'
import { ColumnPinSide, SystemColumnType } from '../column/types'
import { getActionsColumnSize, RowActionsVariant } from '../features/row-actions'
import { setIfDefined } from '../utils/set-if-defined'

import type { SystemColumnDef, TanStackColumnDef } from '../column/types'

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
	/** Presentation of the `__selection__` column, from `selection.column`. */
	selectionColumn?: SystemColumnDef
	/** Presentation of the `__expand__` column, from `expanding.column`. */
	expandingColumn?: SystemColumnDef
	/** Presentation of the `__actions__` column, from `rowActions.column`. */
	rowActionsColumn?: SystemColumnDef
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
/** Default width of the two single-control system columns (checkbox, chevron). */
const NARROW_SYSTEM_COLUMN_SIZE = 44

type SystemColumnSpec = {
	id: string
	type: SystemColumnType
	/** Width used when the def names none. */
	defaultWidth: number
	/** Edge used when the def names none. */
	defaultPinning: ColumnPinSide
	def: SystemColumnDef | undefined
}

/**
 * Turns one system column's spec plus its (optional) user def into a TanStack column.
 *
 * The def's fields go through the very same normalizers a user column's do, so
 * `pinning: 'left'`, `width: 60` and `align: 'center'` mean here exactly what they mean
 * anywhere else. `header` reaches the React layer on `meta.systemHeader` rather than
 * TanStack's `header`, because the header cells for these columns are rendered by the grid
 * (the select-all checkbox lives there) and have to be able to fall back to the built-in.
 */
function buildSystemColumn<TRow extends object>({
	id,
	type,
	defaultWidth,
	defaultPinning,
	def,
}: SystemColumnSpec): TanStackColumnDef<TRow> {
	const widthDef = normalizeColumnWidth(def?.width) ?? { default: defaultWidth }
	const pinning = def?.pinning === undefined ? { side: defaultPinning } : normalizeColumnPinning(def.pinning)

	const meta: TanStackColumnDef<TRow>['meta'] = {
		isSystemColumn: true,
		systemColumnType: type,
	}
	setIfDefined(meta, 'pinning', pinning)
	setIfDefined(meta, 'align', normalizeColumnAlign(def?.align))
	setIfDefined(meta, 'headerClassName', def?.headerClassName)
	setIfDefined(meta, 'cellClassName', def?.cellClassName)
	setIfDefined(meta, 'systemHeader', def?.header)

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const column: Record<string, any> = {
		id,
		header: () => null,
		cell: () => null,
		size: widthDef.default ?? defaultWidth,
		enableSorting: false,
		enableColumnFilter: false,
		meta,
	}
	setIfDefined(column, 'minSize', widthDef.min)
	setIfDefined(column, 'maxSize', widthDef.max)

	return column as TanStackColumnDef<TRow>
}

export function buildColumnList<TRow extends object>(
	userColumns: TanStackColumnDef<TRow>[],
	opts: SystemColumnsOptions,
): TanStackColumnDef<TRow>[] {
	const result: TanStackColumnDef<TRow>[] = []

	if (opts.selection) {
		result.push(
			buildSystemColumn({
				id: SELECTION_COLUMN_ID,
				type: SystemColumnType.Selection,
				defaultWidth: NARROW_SYSTEM_COLUMN_SIZE,
				defaultPinning: ColumnPinSide.Left,
				def: opts.selectionColumn,
			}),
		)
	}

	if (opts.expanding) {
		result.push(
			buildSystemColumn({
				id: EXPAND_COLUMN_ID,
				type: SystemColumnType.Expand,
				defaultWidth: NARROW_SYSTEM_COLUMN_SIZE,
				// Pinned left, like the selection column it sits beside. It was the one system
				// column pinned nowhere, so a horizontally scrolled grid kept the checkbox in
				// view and let the chevron of the same row slide out of it.
				defaultPinning: ColumnPinSide.Left,
				def: opts.expandingColumn,
			}),
		)
	}

	result.push(...userColumns)

	const needsActions = opts.editing || opts.deleting || opts.pinning || opts.customRowActions
	if (needsActions) {
		result.push(
			buildSystemColumn({
				id: ACTIONS_COLUMN_ID,
				type: SystemColumnType.Actions,
				defaultWidth: getActionsColumnSize({
					editing: opts.editing,
					deleting: opts.deleting,
					pinning: opts.pinning,
					custom: opts.customRowActions,
					variant: opts.rowActionsVariant ?? RowActionsVariant.Inline,
				}),
				defaultPinning: ColumnPinSide.Right,
				def: opts.rowActionsColumn,
			}),
		)
	}

	return result
}

/**
 * Extracts initial column pinning state from column defs.
 * Called before passing columns to TanStack so that
 * columns with `meta.pinning.side` or `meta.pinning.initialSide`
 * are registered in initial state.
 */
export function extractPinningState<TRow extends object>(
	columns: TanStackColumnDef<TRow>[],
): { left: string[]; right: string[] } {
	const left: string[] = []
	const right: string[] = []

	for (const col of columns) {
		const pinDef = col.meta?.pinning
		if (!pinDef) continue
		const position = pinDef.side ?? pinDef.initialSide
		const colId = col.id ?? (col as { accessorKey?: string }).accessorKey ?? undefined
		if (!position || !colId) continue
		if (position === ColumnPinSide.Left) left.push(colId)
		else right.push(colId)
	}

	return { left, right }
}
