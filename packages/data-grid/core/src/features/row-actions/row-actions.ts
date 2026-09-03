import type { ActionItem } from '../../action-item'
import type { SystemColumnDef } from '../../column/types'
import type { RowPinningConfig } from '../../types'
import type { FeatureToggle } from '../../utils/feature-flag'
import type { Row, RowData, Table } from '@tanstack/table-core'

/** How the per-row actions (edit / delete / pin) are laid out in the actions column. */
export const RowActionsVariant = {
	/** One icon button per action, side by side. Pin actions stay behind their own menu. */
	Inline: 'inline',
	/** A single overflow menu holding every action. */
	Menu: 'menu',
} as const

export type RowActionsVariant = (typeof RowActionsVariant)[keyof typeof RowActionsVariant]

/** What {@link RowActionsConfig.actions} is handed when a row builds its entries. */
export type RowActionsContext<TRow extends object = object> = {
	row: Row<TRow>
	table: Table<TRow>
}

/**
 * Per-row actions config.
 *
 * `TRow` carries a default so a reference that names no argument still compiles — the
 * `TableOptionsResolved` augmentation below is one such reference, and reads `actions` back
 * only to invoke it.
 *
 * Two node parameters, not one, because the config renders two unrelated things.
 * {@link ActionItem.icon} needs an element (React: `<Copy />`), while
 * {@link SystemColumnDef.header} is column-header content and must accept everything a
 * column's `header` accepts — a string included. Sharing one parameter made
 * `rowActions.column.header: () => 'Actions'` a type error while leaving the same slot on
 * `selection.column` and `expanding.column` unchecked. `TIcon` is the second parameter, where
 * the single node parameter used to be, so `RowActionsConfig<Row, ReactElement>` still means
 * what it meant.
 */
export type RowActionsConfig<TRow extends object = object, TIcon = never, TNode = unknown> = FeatureToggle & {
	/** Layout of the actions column. Default: {@link RowActionsVariant.Inline}. */
	variant?: RowActionsVariant
	/**
	 * Custom entries appended to the built-in edit / delete / pin affordances, built per row.
	 *
	 * The counterpart of `selection.bar.actions`, which takes the same {@link ActionItem}s for
	 * bulk operations, so one action can be written once and offered in both. Both variants honour
	 * it: under {@link RowActionsVariant.Menu} the entries join the one overflow menu, and
	 * under {@link RowActionsVariant.Inline} they go behind the overflow menu that already
	 * carries the pin entries — a fixed-width cell has no icon budget for an open-ended set
	 * of application actions, and an entry may legitimately carry no icon at all.
	 *
	 * Return `[]` for a row that offers nothing.
	 */
	actions?: (ctx: RowActionsContext<TRow>) => ActionItem<TIcon>[]
	/**
	 * Presentation of the auto-injected `__actions__` column — a label for its header, its
	 * width, which edge it pins to. See {@link SystemColumnDef}.
	 *
	 * Named `column` rather than folded into this config's own fields because it configures a
	 * *column*, with the column vocabulary (`header`, `width`, `pinning`, `align`), while
	 * `variant` and `actions` configure what the cells inside it contain.
	 */
	column?: SystemColumnDef<TRow, TNode>
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
	/** Whether `rowActions.actions` was supplied — its entries share the overflow trigger. */
	custom: boolean
	variant: RowActionsVariant
}

/**
 * Width of the `__actions__` column, derived from how many buttons the widest
 * row state renders. Without this the column falls back to TanStack's 150px
 * default — far too wide for one or two icon buttons.
 */
export function getActionsColumnSize({ editing, deleting, pinning, custom, variant }: ActionsColumnSizeInput): number {
	// Pin entries and custom entries share one overflow trigger, so they cost one button
	// between them, not one each.
	const hasOverflow = pinning || custom
	const actionCount = variant === RowActionsVariant.Menu ? 1 : Number(editing) + Number(deleting) + Number(hasOverflow)
	// A row in inline edit mode swaps its buttons for save + cancel, which can be
	// wider than the resting state (e.g. delete-only grids).
	const buttons = Math.max(actionCount, editing ? INLINE_EDITING_BUTTONS : 0)
	return buttons * ACTION_BUTTON_SIZE + (buttons - 1) * ACTION_BUTTON_GAP + ACTIONS_CELL_PADDING
}

declare module '@tanstack/table-core' {
	// `TData` is unused here but must match the declaration being merged into.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptionsResolved<TData extends RowData> {
		rowActions?: RowActionsConfig<object, unknown>
		/** Normalized row-pinning config — `undefined` when row pinning is off. */
		pinning?: RowPinningConfig | false
	}
}
