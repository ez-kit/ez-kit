import { canMoveColumn, ColumnMoveDirection, ColumnPinSide, moveColumn } from '@ez-kit/data-grid-core'

import { GridMenuIcon, toMenuSections } from '../menu'
import { SortDirection } from '../types'

import type { GridMenuSection } from '../menu'
import type { GridFeatures } from '../types'
import type { GridMessages } from '@ez-kit/data-grid-core'
import type { Header } from '@tanstack/table-core'

/** Entry ids for the column header menu. Unique within that menu, nothing more. */
export const ColumnActionId = {
	SortAsc: 'sort-asc',
	SortDesc: 'sort-desc',
	ClearSort: 'clear-sort',
	PinStart: 'pin-start',
	PinEnd: 'pin-end',
	Unpin: 'unpin',
	Hide: 'hide',
	MoveStart: 'move-start',
	MoveEnd: 'move-end',
	// No direction here, so none of the logical/physical reasoning the pin and move pairs carry
	// applies: a grouping level is added or dropped, and neither flips under RTL.
	GroupBy: 'group-by',
	Ungroup: 'ungroup',
} as const

export type ColumnActionId = (typeof ColumnActionId)[keyof typeof ColumnActionId]

const SORTING_SECTION = 'sorting'
const ORDER_SECTION = 'order'
const PIN_SECTION = 'pin'
const VISIBILITY_SECTION = 'visibility'
const GROUPING_SECTION = 'grouping'

export type ColumnMenuCapabilities = {
	canSort: boolean
	canPin: boolean
	canHide: boolean
	canMove: boolean
	canGroup: boolean
}

/**
 * Turns a header plus what the grid allows on it into the menu the kit renders.
 *
 * The grouping lives here — it is structure, identical across kits — while the trigger, the
 * icons and the chrome stay in each kit. Sections with no entries are dropped, so an empty
 * result means "render no menu at all".
 *
 * The wording comes in as `messages`, the grid's resolved `messages.columnMenu`, rather than
 * from a table in this module: this is the one place the entries are named, so a hardcoded
 * table here would be untranslatable in both kits at once.
 */
export function buildColumnMenuSections<TRow extends object>(
	header: Header<GridFeatures, TRow>,
	{ canSort, canPin, canHide, canMove, canGroup }: ColumnMenuCapabilities,
	messages: GridMessages['columnMenu'],
): GridMenuSection[] {
	const column = header.column
	// Optional-called: `header-cell.tsx` builds the menu for every header cell, so this runs on a
	// grid with no sorting registered. See `feature-optionality.test.tsx`.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const sortDir = column.getIsSorted?.() ?? false
	const isPinned = column.getIsPinned()

	const sorting: GridMenuSection = { id: SORTING_SECTION, label: messages.sorting, items: [] }
	if (canSort) {
		if (sortDir !== SortDirection.Asc) {
			sorting.items.push({
				id: ColumnActionId.SortAsc,
				label: messages.sortAsc,
				icon: GridMenuIcon.SortAsc,
				onAction: () => {
					column.toggleSorting(false)
				},
			})
		}
		if (sortDir !== SortDirection.Desc) {
			sorting.items.push({
				id: ColumnActionId.SortDesc,
				label: messages.sortDesc,
				icon: GridMenuIcon.SortDesc,
				onAction: () => {
					column.toggleSorting(true)
				},
			})
		}
		if (sortDir) {
			sorting.items.push({
				id: ColumnActionId.ClearSort,
				label: messages.clearSort,
				icon: GridMenuIcon.ClearSort,
				onAction: () => {
					column.clearSorting()
				},
			})
		}
	}

	// Both directions are always listed, disabled at the ends: an entry that appears and
	// disappears as the column travels makes the menu jump under the pointer, and the disabled
	// state is also what says "this column is locked" rather than saying nothing at all.
	const order: GridMenuSection = { id: ORDER_SECTION, label: messages.order, items: [] }
	if (canMove) {
		const table = header.getContext().table
		for (const [id, direction, icon, label] of [
			[ColumnActionId.MoveStart, ColumnMoveDirection.Start, GridMenuIcon.MoveStart, messages.moveStart],
			[ColumnActionId.MoveEnd, ColumnMoveDirection.End, GridMenuIcon.MoveEnd, messages.moveEnd],
		] as const) {
			order.items.push({
				id,
				label,
				icon,
				disabled: !canMoveColumn(table, column.id, direction),
				onAction: () => {
					table.setColumnOrder(moveColumn(table, column.id, direction))
				},
			})
		}
	}

	const pin: GridMenuSection = { id: PIN_SECTION, label: messages.pin, items: [] }
	/*
	 * The side vocabulary is logical (`start` / `end`), not physical: a pinned column sticks to
	 * the inline-start or inline-end edge, and which physical edge that is flips under RTL. The
	 * English default labels stay "Pin Left" / "Pin Right" — same convention as
	 * `moveStart: 'Move left'`: the key names the axis, the wording names what an LTR reader sees.
	 */
	if (canPin) {
		if (isPinned !== ColumnPinSide.Start) {
			pin.items.push({
				id: ColumnActionId.PinStart,
				label: messages.pinStart,
				icon: GridMenuIcon.PinStart,
				onAction: () => {
					column.pin(ColumnPinSide.Start)
				},
			})
		}
		if (isPinned !== ColumnPinSide.End) {
			pin.items.push({
				id: ColumnActionId.PinEnd,
				label: messages.pinEnd,
				icon: GridMenuIcon.PinEnd,
				onAction: () => {
					column.pin(ColumnPinSide.End)
				},
			})
		}
		if (isPinned) {
			pin.items.push({
				id: ColumnActionId.Unpin,
				label: messages.unpin,
				icon: GridMenuIcon.Unpin,
				onAction: () => {
					column.pin(false)
				},
			})
		}
	}

	const visibility: GridMenuSection = { id: VISIBILITY_SECTION, items: [] }
	if (canHide) {
		visibility.items.push({
			id: ColumnActionId.Hide,
			label: messages.hide,
			icon: GridMenuIcon.Hide,
			onAction: () => {
				column.toggleVisibility(false)
			},
		})
	}

	/*
	 * One entry, not two: a column is either a grouping level or it is not, so listing both
	 * spellings would always leave one of them inert. The pin section lists three because a
	 * column has three pin states; this axis has two.
	 *
	 * **In practice only `GroupBy` is reachable, and that is a consequence of
	 * `groupedColumnMode: 'remove'` rather than an oversight.** Core removes a column from the
	 * list while it is a grouping level — which is what stops `__group__` and the column showing
	 * the same value twice — so a grouped column has no header cell, and a header cell is what
	 * hangs this menu. Dropping a level is therefore `<DataGrid.GroupByBar />`'s job. The
	 * `Ungroup` branch stays because it costs nothing and is correct the moment a grid renders a
	 * grouped column's header by any other route; `group-by-bar.test.tsx` pins the fact that it
	 * does not today, so this comment cannot quietly go stale.
	 *
	 * Optional-called like the sort read above — this runs for every header cell of every grid,
	 * and `columnGroupingFeature` is not structural.
	 */
	const grouping: GridMenuSection = { id: GROUPING_SECTION, label: messages.grouping, items: [] }
	if (canGroup) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
		const isGrouped = column.getIsGrouped?.() ?? false
		grouping.items.push({
			id: isGrouped ? ColumnActionId.Ungroup : ColumnActionId.GroupBy,
			label: isGrouped ? messages.ungroup : messages.groupBy,
			icon: isGrouped ? GridMenuIcon.Ungroup : GridMenuIcon.Group,
			onAction: () => {
				column.toggleGrouping()
			},
		})
	}

	return toMenuSections([sorting, grouping, order, pin, visibility])
}
