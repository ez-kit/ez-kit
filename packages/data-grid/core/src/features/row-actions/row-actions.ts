import type { ActionItemDef, ActionItemSlot } from '../../action-item'
import type { SystemColumnDef } from '../../column/types'
import type { RowPinningConfig } from '../../types'
import type { FeatureToggle } from '../../utils/feature-flag'
import type { Row, RowData, Table } from '@tanstack/table-core'

/**
 * Which container holds a row action: the cell itself, or the overflow menu.
 *
 * One vocabulary at two levels. On {@link RowActionsConfig} it is the layout of the built-in
 * edit / delete pair — the whole column collapses to a single trigger under
 * {@link RowActionsPlacement.Menu}. On a {@link RowActionItem} it is that one entry's own
 * home, defaulting to the menu whatever the column says.
 *
 * `placement`, not `variant`: this names the container a control sits in, which is the same
 * question `filtering.panel.placement` and `pagination.pageSizer.placement` answer.
 */
export const RowActionsPlacement = {
	/** One icon button per action, side by side. Pin actions stay behind their own menu. */
	Inline: 'inline',
	/** A single overflow menu holding every action. */
	Menu: 'menu',
} as const

export type RowActionsPlacement = (typeof RowActionsPlacement)[keyof typeof RowActionsPlacement]

/**
 * One entry an application contributes to a row — an {@link ActionItem} that also says where
 * in the cell it goes.
 *
 * `placement` is the row's own field because a row has two containers to choose between and
 * the selection bar has one: every bar entry is already a button, so the option would be
 * accepted and ignored there.
 *
 * It defaults to {@link RowActionsPlacement.Menu} whatever the column's placement is — inline
 * is always an explicit opt-in. That is what makes the icon requirement below sound: a column
 * switched to `inline` cannot silently promote entries that never claimed they had a glyph to
 * show.
 */
export type RowActionItem<TNode = never> =
	| (ActionItemDef<TNode> & {
			/** Default. The entry joins the overflow menu, drawn as icon (if any) plus label. */
			placement?: typeof RowActionsPlacement.Menu
	  })
	| (ActionItemDef<TNode> & {
			/**
			 * The entry becomes an icon button in the cell, beside the built-in edit / delete.
			 *
			 * Only under a column with `placement: 'inline'` — a column collapsed to one menu has
			 * no cell to put a button in, so the entry falls back to the menu there and the cell
			 * says so in development. (The check cannot live in `createTable`: `actions` is a
			 * function of the row, so its entries exist only once a row renders.)
			 */
			placement: typeof RowActionsPlacement.Inline
			/** Required here: an icon button with no icon is a blank square. */
			icon: TNode
	  })
	| (ActionItemSlot<TNode> & {
			/** Default. The entry's markup fills a menu entry the kit wraps. */
			placement?: typeof RowActionsPlacement.Menu
	  })
	| (ActionItemSlot<TNode> & {
			/** The entry's markup stands in the cell, unwrapped. */
			placement: typeof RowActionsPlacement.Inline
			/**
			 * How much room the markup needs, in px. The grid cannot measure what it did not
			 * draw, so without it the cell budgets one icon button (32px) and says so in
			 * development.
			 */
			width?: number
	  })

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
 * {@link ActionItemDef.icon} needs an element (React: `<Copy />`), while
 * {@link SystemColumnDef.header} is column-header content and must accept everything a
 * column's `header` accepts — a string included. Sharing one parameter made
 * `rowActions.column.header: () => 'Actions'` a type error while leaving the same slot on
 * `selection.column` and `expanding.column` unchecked. `TIcon` is the second parameter, where
 * the single node parameter used to be, so `RowActionsConfig<Row, ReactElement>` still means
 * what it meant.
 */
export type RowActionsConfig<TRow extends object = object, TIcon = never, TNode = unknown> = FeatureToggle & {
	/**
	 * Where the built-in edit / delete pair lives. Default:
	 * {@link RowActionsPlacement.Inline}.
	 *
	 * Governs the built-ins only. The pin entries are always in the menu — there are up to
	 * three of them and one applies at a time — and each entry of {@link actions} carries its
	 * own {@link RowActionItem.placement}.
	 */
	placement?: RowActionsPlacement
	/**
	 * Custom entries added to the built-in edit / delete / pin affordances, built per row.
	 *
	 * The counterpart of `selection.bar.actions`, which takes the same entries for bulk
	 * operations, so one action can be written once and offered in both. An entry joins the
	 * overflow menu unless it asks for `placement: 'inline'`; see {@link RowActionItem}.
	 *
	 * Return `[]` for a row that offers nothing.
	 */
	actions?: (ctx: RowActionsContext<TRow>) => RowActionItem<TIcon>[]
	/**
	 * Presentation of the auto-injected `__actions__` column — a label for its header, its
	 * width, which edge it pins to. See {@link SystemColumnDef}.
	 *
	 * Named `column` rather than folded into this config's own fields because it configures a
	 * *column*, with the column vocabulary (`header`, `width`, `pinning`, `align`), while
	 * `placement` and `actions` configure what the cells inside it contain.
	 *
	 * Its `width` is also the answer to a cell whose inline entries the grid cannot count in
	 * advance: `actions` is a function of the row, so the auto-sized width below covers the
	 * built-ins and one overflow trigger, and a grid that promotes entries to inline buttons
	 * states its own width here.
	 */
	column?: SystemColumnDef<TRow, TNode>
}

/** Rendered width of one icon button in the actions cell. */
export const ACTION_BUTTON_SIZE = 32
/** Gap between two adjacent action buttons. */
const ACTION_BUTTON_GAP = 4
/** Horizontal padding of the actions cell (both sides). */
const ACTIONS_CELL_PADDING = 32
/** An inline row form — editing or creating — always shows exactly two buttons: save + cancel. */
const INLINE_FORM_BUTTONS = 2

type ActionsColumnSizeInput = {
	editing: boolean
	deleting: boolean
	pinning: boolean
	/**
	 * Whether an inline creating row can appear (`creating.mode` is `'row'` or `'pin-row'`).
	 *
	 * It renders its save / cancel pair in this column exactly as an editing row does, so it
	 * reserves the same width — even in a grid with no other row action.
	 */
	creating: boolean
	/** Whether `rowActions.actions` was supplied — its entries share the overflow trigger. */
	custom: boolean
	placement: RowActionsPlacement
}

/**
 * Width an actions cell needs to lay out buttons of the given widths, side by side.
 *
 * Takes widths rather than a count because not every button is one icon wide: an inline
 * `RowActionItem` that brought its own `component` declares its own `width`. Shared with the
 * React layer, which measures a rendered cell against the column to tell an author when their
 * inline entries no longer fit.
 */
export function getActionsCellWidth(buttonWidths: readonly number[]): number {
	const gaps = Math.max(buttonWidths.length - 1, 0)
	const content = buttonWidths.reduce((total, width) => total + width, 0)
	return content + gaps * ACTION_BUTTON_GAP + ACTIONS_CELL_PADDING
}

/**
 * Width of the `__actions__` column, derived from how many buttons the widest
 * row state renders. Without this the column falls back to TanStack's 150px
 * default — far too wide for one or two icon buttons.
 *
 * Covers the affordances the grid knows about before any row exists: the built-in pair and
 * the one overflow trigger. Entries from `rowActions.actions` that ask for
 * {@link RowActionsPlacement.Inline} are *not* in it and cannot be — `actions` is a function
 * of the row, so their number is unknown here and may differ from row to row. A grid that uses
 * them states the width itself on `rowActions.column`.
 */
export function getActionsColumnSize({
	editing,
	deleting,
	pinning,
	creating,
	custom,
	placement,
}: ActionsColumnSizeInput): number {
	// Pin entries and menu-placed custom entries share one overflow trigger, so they cost one
	// button between them, not one each.
	const hasOverflow = pinning || custom
	const actionCount =
		placement === RowActionsPlacement.Menu ? 1 : Number(editing) + Number(deleting) + Number(hasOverflow)
	// A row in an inline form — editing or creating — swaps its buttons for save + cancel,
	// which can be wider than the resting state (e.g. delete-only grids).
	const buttons = Math.max(actionCount, editing || creating ? INLINE_FORM_BUTTONS : 0)
	return getActionsCellWidth(new Array<number>(buttons).fill(ACTION_BUTTON_SIZE))
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
