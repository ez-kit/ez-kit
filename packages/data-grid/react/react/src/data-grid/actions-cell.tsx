import {
	ACTION_BUTTON_SIZE,
	ACTIONS_COLUMN_ID,
	CommitStatus,
	EditingMode,
	getActionsCellWidth,
	RowActionsPlacement,
} from '@ez-kit/data-grid-core'

import { useGridComponents } from '../components-context'
import { GridMenuIcon, GridMenuVariant, toMenuSections } from '../menu'
import { ActionsCellState, RowActionId } from '../types'

import { splitRowActionItems } from './build-action-items'
import { buildRowOrderItems } from './build-row-order-items'
import { useDataGridTable, useDataGridState } from './table-context'

import type { DataTable, ErasedRow, GridFeatures } from '../types'
import type { RowActionGroups } from './build-action-items'
import type { GridMenuItem, GridMenuSection } from '../menu'
import type { RowActionItem, RowActionsContext, RowPinningConfig, GridMessages } from '@ez-kit/data-grid-core'
import type { Row } from '@tanstack/table-core'
import type { ReactElement } from 'react'

type ActionsCellProps = {
	row: Row<GridFeatures, ErasedRow>
}

const ICONS: Record<RowActionId, GridMenuIcon> = {
	[RowActionId.Edit]: GridMenuIcon.Edit,
	[RowActionId.Delete]: GridMenuIcon.Delete,
	[RowActionId.PinTop]: GridMenuIcon.PinTop,
	[RowActionId.PinBottom]: GridMenuIcon.PinBottom,
	[RowActionId.Unpin]: GridMenuIcon.Unpin,
	[RowActionId.MoveUp]: GridMenuIcon.MoveUp,
	[RowActionId.MoveDown]: GridMenuIcon.MoveDown,
}

const ACTIONS_SECTION = 'row-actions'
const CUSTOM_SECTION = 'row-actions-custom'
const PIN_SECTION = 'row-pinning'
const ORDER_SECTION = 'row-ordering'

const IS_DEV = process.env.NODE_ENV !== 'production'

/** A grid with no `rowActions.actions` splits nothing — one shared value, never mutated. */
const EMPTY_GROUPS: RowActionGroups = { inline: [], menu: [], inlineWidths: [] }

/** One warning per grid, however many rows render it. Keyed by the message. */
const warned = new Set<string>()

type CellFitInput<TRow extends object> = {
	table: DataTable<GridFeatures, TRow>
	hasEditing: boolean
	hasDeleting: boolean
	inlineWidths: number[]
	hasOverflow: boolean
}

/**
 * Development-only: says so when a row's inline entries no longer fit the actions column.
 *
 * `getActionsColumnSize` sizes the column before any row exists, so it can only budget the
 * built-in pair and the overflow trigger. Entries promoted to inline buttons are the author's
 * to account for — this turns "the last button is clipped" into the number to put in
 * `rowActions.column.width`.
 */
function warnIfCellOverflows<TRow extends object>({
	table,
	hasEditing,
	hasDeleting,
	inlineWidths,
	hasOverflow,
}: CellFitInput<TRow>): void {
	if (inlineWidths.length === 0) return
	const builtIns = [
		...(hasEditing ? [ACTION_BUTTON_SIZE] : []),
		...(hasDeleting ? [ACTION_BUTTON_SIZE] : []),
		...(hasOverflow ? [ACTION_BUTTON_SIZE] : []),
	]
	const needed = getActionsCellWidth([...builtIns, ...inlineWidths])
	const actual = table.getColumn(ACTIONS_COLUMN_ID)?.getSize() ?? 0
	if (needed <= actual) return
	const message =
		`[data-grid] The actions column is ${String(actual)}px but this row's inline actions need ` +
		`${String(needed)}px, so the last of them is clipped. \`rowActions.actions\` is a function of the ` +
		`row, so the grid cannot size the column for entries it has not built yet — set ` +
		`\`rowActions.column.width\`.`
	if (warned.has(message)) return
	warned.add(message)
	console.warn(message)
}

/**
 * Builds the pin entries for a row: the two pin directions the config allows,
 * plus `Unpin` once the row is pinned.
 */
function buildPinItems<TRow extends object>(
	row: Row<GridFeatures, TRow>,
	config: RowPinningConfig,
	messages: GridMessages['rowActions'],
): GridMenuItem[] {
	const isPinned = row.getIsPinned()
	const items: GridMenuItem[] = []

	if (config.top) {
		items.push({
			id: RowActionId.PinTop,
			label: messages.pinTop,
			icon: ICONS[RowActionId.PinTop],
			disabled: isPinned === 'top',
			onAction: () => {
				row.pin('top', false, false)
			},
		})
	}
	if (config.bottom) {
		items.push({
			id: RowActionId.PinBottom,
			label: messages.pinBottom,
			icon: ICONS[RowActionId.PinBottom],
			disabled: isPinned === 'bottom',
			onAction: () => {
				row.pin('bottom', false, false)
			},
		})
	}
	if (isPinned) {
		items.push({
			id: RowActionId.Unpin,
			label: messages.unpin,
			icon: ICONS[RowActionId.Unpin],
			onAction: () => {
				row.pin(false, false, false)
			},
		})
	}

	return items
}

/**
 * What to call the overflow trigger, which is named for what is inside it.
 *
 * The generic name once an application contributed entries, or once more than one built-in
 * group is in there; the specific one when a single group is all the menu holds. Without the
 * `order` arm an ordering-only menu would announce itself as "Row pinning".
 */
function overflowLabel(
	messages: GridMessages['rowActions'],
	counts: { custom: number; pin: number; order: number },
): string {
	if (counts.custom > 0) return messages.menu
	if (counts.pin > 0 && counts.order > 0) return messages.menu
	if (counts.order > 0) return messages.ordering
	return messages.pinning
}

/**
 * Renders the per-row actions column: edit / delete plus the row-pin menu.
 *
 * Two layouts, chosen by `rowActions.variant`:
 * - `inline` — one icon button per action side by side, pin actions behind
 *   their own overflow menu;
 * - `menu` — a single overflow menu holding every action.
 *
 * Custom entries from `rowActions.actions` join the overflow menu unless they asked for
 * `placement: 'inline'`, in which case they become icon buttons after the built-in pair. Menu
 * is their default whatever the column says, so a column switched to `inline` never promotes an
 * entry that did not claim an icon to show.
 *
 * A row in inline edit mode always falls back to the inline save / cancel
 * buttons: burying a commit inside a dropdown would hide it behind an extra
 * click while the row is mid-edit.
 *
 * Subscribes only via two boolean selectors that are stably `false` for
 * non-target rows — so editing mutations on a different row do NOT re-render
 * this `ActionsCell`. For the targeted row, the booleans flip exactly when
 * the row enters / leaves edit mode and when the commit status leaves `idle`.
 */
export function ActionsCell({ row }: ActionsCellProps) {
	const table = useDataGridTable()
	const { ActionsCell: Renderer } = useGridComponents().rowActions
	const { Menu } = useGridComponents().core
	const messages = table.grid.messages.rowActions

	// Stable booleans — non-target rows stay `false` across any editing change.
	//
	// Optional-chained: this column mounts whenever `editing`, `deleting`, row `pinning` **or**
	// `rowActions.actions` is configured, not only `editing` — so a delete-only grid reached these
	// two reads with no `editing` slice on the state and threw before the table mounted. The
	// `Boolean(table.options.editing)` three lines below is what the intent always was; only these
	// missed it. Same for `rowPinning`, which is subscribed here for any of the four reasons.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isEditing = useDataGridState((s) => s.editing?.rowId === row.id)
	// The second read needs no `?.` of its own: `&&` short-circuits on the first when the slice is
	// absent, so it is only reached once `s.editing` is known to be there.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isPending = useDataGridState((s) => s.editing?.rowId === row.id && s.editing.commitStatus !== CommitStatus.Idle)
	// Row pinning is derived state; subscribe so the menu re-derives on pin/unpin.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	useDataGridState((s) => s.rowPinning ?? null)

	const editingMode = table.options.editing?.mode ?? EditingMode.Row
	// Cell mode owns no affordance in this column: its edit is opened by double-clicking the
	// cell, committed on blur / Enter and cancelled with Escape. The pencil here would call
	// `editing.start(rowId)` — the row flow — and open no input at all.
	const hasEditing = Boolean(table.options.editing) && editingMode !== EditingMode.Cell
	const hasDeleting = Boolean(table.options.deleting)
	// `table.grid`, not `table.options`: row pinning config, `rowActions` and `virtualization`
	// left the TanStack options bag for the grid bag when v9 removed `TableOptionsResolved`
	// (core's `GridOptions`). Reading them off `options` now yields `undefined` — which is how
	// the whole pin section of this cell disappeared.
	const pinConfig = table.grid.pinning.rowConfig

	// Mid-edit: save / cancel only. Row mode alone — a modal carries its own buttons, and a cell
	// edit commits itself, so neither should swap this column out from under the user.
	if (isEditing && editingMode === EditingMode.Row) {
		return (
			<Renderer
				state={ActionsCellState.Editing}
				row={row}
				onSave={() => table.editing.commit()}
				onCancel={() => {
					table.editing.cancel()
				}}
				isPending={isPending}
			/>
		)
	}

	const pinItems = pinConfig ? buildPinItems(row, pinConfig, messages) : []
	const orderItems = table.grid.ordering.row ? buildRowOrderItems(row, table, messages) : []
	const buildActions = table.grid.rowActions.actions
	// The augmented option is `RowActionsConfig<object, unknown>` — the row type and the node
	// type are both erased at the `table.options` boundary — so the row/table this cell holds
	// are narrowed at the call, and the returned items are re-bound to this layer's node type.
	// `buildActionItems` still checks each icon at runtime; see its `toMenuIcon`.
	//
	// Two casts, one per member, and neither is about the feature arity — do not re-arity this.
	// `RowActionsContext` fixes `TRow` at `object`, which `exactOptionalPropertyTypes` refuses to
	// take from the `any`-rowed pair this cell holds; and since Task 14 this package's `DataTable`
	// carries `grid: ResolvedGridOptions`, so it is no longer core's `Table` at **any**
	// instantiation. pr1-outcomes §2.7 expected core typing `RowActionsContext.table` as the widest
	// instantiation to make this assign on its own; that held for the feature parameter and was
	// overtaken by the `grid` split.
	//
	// Per member rather than one `as RowActionsContext` over the whole literal — **do not
	// "simplify" it back**. A single `as` over an object literal only asks for comparability, so a
	// **required** member added to `RowActionsContext` later would leave this literal legal and
	// that member silently missing at runtime. (An *optional* one is missed either way — that is
	// what optional means, and no annotation recovers it.) Annotating the binding keeps the
	// excess-property and missing-property checks: a new required member fails here as `TS2741`,
	// where the assertion form would only fail if the two types stopped overlapping. Each cast
	// goes through the
	// context's own member type, which is why neither one names an arity.
	// Erased on both sides: `table.grid.rowActions.actions` was stored row-erased, so the
	// context handed to it is too. See `ErasedRow`.
	const actionsCtx: RowActionsContext<ErasedRow> = {
		row: row,
		table: table,
	}
	const placement = table.grid.rowActions.placement
	const {
		inline: inlineItems,
		menu: customItems,
		inlineWidths,
	} = buildActions
		? splitRowActionItems(buildActions(actionsCtx) as RowActionItem<ReactElement>[], placement)
		: EMPTY_GROUPS

	if (placement === RowActionsPlacement.Menu) {
		const actions: GridMenuItem[] = []
		if (hasEditing) {
			actions.push({
				id: RowActionId.Edit,
				label: messages.edit,
				icon: ICONS[RowActionId.Edit],
				onAction: () => {
					table.editing.start(row.id)
				},
			})
		}
		if (hasDeleting) {
			actions.push({
				id: RowActionId.Delete,
				label: messages.delete,
				icon: ICONS[RowActionId.Delete],
				destructive: true,
				onAction: () => {
					table.deleting.request(row.id)
				},
			})
		}

		const sections: GridMenuSection[] = toMenuSections([
			{ id: ACTIONS_SECTION, items: actions },
			{ id: CUSTOM_SECTION, items: customItems },
			{ id: PIN_SECTION, items: pinItems },
			{ id: ORDER_SECTION, items: orderItems },
		])
		return (
			<Menu
				variant={GridMenuVariant.Row}
				sections={sections}
				aria-label={messages.menu}
			/>
		)
	}

	// Inline: the built-ins stay icon buttons, entries that asked for it join them, and the rest
	// share the overflow menu with the pin entries — one trigger, whose width
	// `getActionsColumnSize` reserves.
	const overflowSections: GridMenuSection[] = toMenuSections([
		{ id: CUSTOM_SECTION, items: customItems },
		{ id: PIN_SECTION, items: pinItems },
		{ id: ORDER_SECTION, items: orderItems },
	])

	if (IS_DEV) {
		warnIfCellOverflows({
			table,
			hasEditing,
			hasDeleting,
			inlineWidths,
			hasOverflow: overflowSections.length > 0,
		})
	}

	return (
		<>
			<Renderer
				state={ActionsCellState.Idle}
				row={row}
				hasEditing={hasEditing}
				hasDeleting={hasDeleting}
				actions={inlineItems}
				onEdit={() => {
					table.editing.start(row.id)
				}}
				onDelete={() => {
					table.deleting.request(row.id)
				}}
			/>
			{overflowSections.length > 0 && (
				<Menu
					variant={GridMenuVariant.Row}
					sections={overflowSections}
					aria-label={overflowLabel(messages, {
						custom: customItems.length,
						pin: pinItems.length,
						order: orderItems.length,
					})}
				/>
			)}
		</>
	)
}
