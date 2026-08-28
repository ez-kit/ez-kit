import type { GridMenuIcon } from '../../menu-icon'
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
 * One custom entry contributed through {@link RowActionsConfig.actions}.
 *
 * Structurally the React layer's `GridMenuItem`. `TNode` is the adapter's node type — the same
 * parameter {@link ColumnRenderer} and {@link ExpandingConfig} take, and for the same reason:
 * core has to describe "a renderable thing" without naming React. It defaults to `never`, so a
 * config written against bare core accepts only the named glyphs; the React adapter binds it to
 * `ReactElement` (see `ReactRowActionsConfig`).
 */
export type RowActionItem<TNode = never> = {
	/** Stable within the menu — kits key their collection items on it. */
	id: string
	label: string
	/**
	 * The entry's glyph: either a member of the closed {@link GridMenuIcon} set, which the kit
	 * maps to its own icon and sizing, or the adapter's own node for an application action the
	 * set has no honest name for — React: `icon: <Copy />`.
	 *
	 * Deliberately **not** a bare `string`. It was one, and a kit silently dropped any value
	 * that named no member, so `icon: 'copy'` compiled, ran, and rendered a label with no glyph
	 * and no error anywhere. Omitting it entirely is still fine — the entry renders label-only.
	 */
	icon?: GridMenuIcon | TNode
	disabled?: boolean
	/**
	 * Destructive entry — kits render it in their danger colour, like the built-in Delete.
	 *
	 * Named `destructive`, matching {@link BadgeVariant.Destructive}: one word for the
	 * "this action destroys something" semantic across the whole API, rather than `danger`
	 * here and `destructive` there.
	 */
	destructive?: boolean
	onSelect: () => void
}

/**
 * Per-row actions config.
 *
 * `TRow` carries a default so a reference that names no argument still compiles — the
 * `TableOptionsResolved` augmentation below is one such reference, and reads `actions` back
 * only to invoke it.
 */
export type RowActionsConfig<TRow extends object = object, TNode = never> = FeatureToggle & {
	/** Layout of the actions column. Default: {@link RowActionsVariant.Inline}. */
	variant?: RowActionsVariant
	/**
	 * Custom entries appended to the built-in edit / delete / pin affordances, built per row.
	 *
	 * The counterpart of `selection.bar.actions` for bulk operations. Both variants honour
	 * it: under {@link RowActionsVariant.Menu} the entries join the one overflow menu, and
	 * under {@link RowActionsVariant.Inline} they go behind the overflow menu that already
	 * carries the pin entries — a fixed-width cell has no icon budget for an open-ended set
	 * of application actions, and an entry may legitimately carry no icon at all.
	 *
	 * Return `[]` for a row that offers nothing.
	 */
	actions?: (ctx: RowActionsContext<TRow>) => RowActionItem<TNode>[]
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
