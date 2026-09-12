import { canMoveColumn, ColumnMoveDirection, ColumnPinSide, moveColumn } from '@ez-kit/data-grid-core'

import { GridMenuIcon, toMenuSections } from '../menu'
import { SortDirection } from '../types'

import type { GridMenuSection } from '../menu'
import type { GridMessages } from '@ez-kit/data-grid-core'
import type { Header } from '@tanstack/table-core'

/** Entry ids for the column header menu. Unique within that menu, nothing more. */
export const ColumnActionId = {
	SortAsc: 'sort-asc',
	SortDesc: 'sort-desc',
	ClearSort: 'clear-sort',
	PinLeft: 'pin-left',
	PinRight: 'pin-right',
	Unpin: 'unpin',
	Hide: 'hide',
	MoveStart: 'move-start',
	MoveEnd: 'move-end',
} as const

export type ColumnActionId = (typeof ColumnActionId)[keyof typeof ColumnActionId]

const SORTING_SECTION = 'sorting'
const ORDER_SECTION = 'order'
const PIN_SECTION = 'pin'
const VISIBILITY_SECTION = 'visibility'

export type ColumnMenuCapabilities = {
	canSort: boolean
	canPin: boolean
	canHide: boolean
	canMove: boolean
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
export function buildColumnMenuSections(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	header: Header<any, unknown>,
	{ canSort, canPin, canHide, canMove }: ColumnMenuCapabilities,
	messages: GridMessages['columnMenu'],
): GridMenuSection[] {
	const column = header.column
	const sortDir = column.getIsSorted()
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
	if (canPin) {
		if (isPinned !== ColumnPinSide.Left) {
			pin.items.push({
				id: ColumnActionId.PinLeft,
				label: messages.pinLeft,
				icon: GridMenuIcon.PinLeft,
				onAction: () => {
					column.pin(ColumnPinSide.Left)
				},
			})
		}
		if (isPinned !== ColumnPinSide.Right) {
			pin.items.push({
				id: ColumnActionId.PinRight,
				label: messages.pinRight,
				icon: GridMenuIcon.PinRight,
				onAction: () => {
					column.pin(ColumnPinSide.Right)
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

	return toMenuSections([sorting, order, pin, visibility])
}
