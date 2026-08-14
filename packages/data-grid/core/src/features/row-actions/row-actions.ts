import type { RowPinningConfig } from '../../types'
import type { RowData } from '@tanstack/table-core'

/** How the per-row actions (edit / delete / pin) are laid out in the actions column. */
export enum RowActionsVariant {
	/** One icon button per action, side by side. Pin actions stay behind their own menu. */
	Inline = 'inline',
	/** A single overflow menu holding every action. */
	Menu = 'menu',
}

export type RowActionsConfig = {
	/** Layout of the actions column. Default: {@link RowActionsVariant.Inline}. */
	variant?: RowActionsVariant
}

/** Rendered width of one icon button in the actions cell. */
const ACTION_BUTTON_SIZE = 32
/** Gap between two adjacent action buttons. */
const ACTION_BUTTON_GAP = 4
/** Horizontal padding of the actions cell (both sides). */
const ACTIONS_CELL_PADDING = 32
/** Inline row editing always shows exactly two buttons: save + cancel. */
const INLINE_EDITING_BUTTONS = 2

type ActionsColumnSizeInput = {
	editing: boolean
	deleting: boolean
	pinning: boolean
	variant: RowActionsVariant
}

/**
 * Width of the `__actions__` column, derived from how many buttons the widest
 * row state renders. Without this the column falls back to TanStack's 150px
 * default — far too wide for one or two icon buttons.
 */
export function getActionsColumnSize({ editing, deleting, pinning, variant }: ActionsColumnSizeInput): number {
	const actionCount = variant === RowActionsVariant.Menu ? 1 : Number(editing) + Number(deleting) + Number(pinning)
	// A row in inline edit mode swaps its buttons for save + cancel, which can be
	// wider than the resting state (e.g. delete-only grids).
	const buttons = Math.max(actionCount, editing ? INLINE_EDITING_BUTTONS : 0)
	return buttons * ACTION_BUTTON_SIZE + (buttons - 1) * ACTION_BUTTON_GAP + ACTIONS_CELL_PADDING
}

declare module '@tanstack/table-core' {
	// `TData` is unused here but must match the declaration being merged into.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptionsResolved<TData extends RowData> {
		rowActions?: RowActionsConfig
		/** Normalized row-pinning config — `undefined` when row pinning is off. */
		pinning?: RowPinningConfig | false
	}
}
