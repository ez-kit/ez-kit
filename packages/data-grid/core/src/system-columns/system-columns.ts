import type { TanStackColumnDef } from '../column/types'

/** Identifier constants for auto-injected system columns. */
export const SELECTION_COLUMN_ID = '__selection__'
export const EXPAND_COLUMN_ID = '__expand__'
export const ACTIONS_COLUMN_ID = '__actions__'
export const ROW_PIN_COLUMN_ID = '__row_pin__'

type SystemColumnsOptions = {
	selection: boolean
	expanding: boolean
	editing: boolean
	deleting: boolean
	pinning: boolean
}

/**
 * Builds the final column list:
 * [__selection__, __expand__, ...user columns, __actions__]
 *
 * System columns contain no cell renderers (framework-agnostic stubs).
 * The React layer renders them based on meta.systemColumnType.
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

	const needsActions = opts.editing || opts.deleting
	if (needsActions) {
		result.push({
			id: ACTIONS_COLUMN_ID,
			header: () => null,
			cell: () => null,
			enableSorting: false,
			enableColumnFilter: false,
			meta: {
				isSystemColumn: true,
				systemColumnType: 'actions',
				columnPinning: { pin: 'right' },
			},
		})
	}

	if (opts.pinning) {
		result.push({
			id: ROW_PIN_COLUMN_ID,
			header: () => null,
			cell: () => null,
			enableSorting: false,
			enableColumnFilter: false,
			meta: {
				isSystemColumn: true,
				systemColumnType: 'row_pin',
			},
		})
	}

	return result
}

/**
 * Extracts initial column pinning state from column defs.
 * Called before passing columns to TanStack so that
 * columns with `meta.columnPinning.pin` or `meta.columnPinning.defaultPin`
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
		const position = pinDef.pin ?? pinDef.defaultPin
		const colId = col.id ?? (col as { accessorKey?: string }).accessorKey ?? undefined
		if (!position || !colId) continue
		if (position === 'left') left.push(colId)
		else right.push(colId)
	}

	return { left, right }
}
