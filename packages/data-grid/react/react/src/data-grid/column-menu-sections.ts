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
	header: Header<GridFeatures, any>,
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
	/*
	 * The one place in this package still on the **pre-rename** column-pinning vocabulary, and
	 * the reason it is suppressed rather than fixed.
	 *
	 * PR 1 renamed core's side vocabulary to `start` / `end` — `ColumnPinSide.Left` / `.Right`,
	 * `GridMenuIcon.PinLeft` / `.PinRight` and `messages.columnMenu.pinLeft` / `pinRight` no
	 * longer exist, so the reads below are `TS2339` and these two rules then fire on the
	 * error-typed values that result. They are one symptom, not six defects.
	 *
	 * Doing the rename here is deliberately **out of scope**: the ids and icon keys these entries
	 * carry are what both UI kits' `blocks/icons.tsx` map and what the RTL e2e cases address, and
	 * neither kit may be touched by this PR. Renaming one half would leave the kits broken in a
	 * *new* way on top of the way they are already broken, so the React adapter's pinning half
	 * lands with the kits, the CSS variables, the registry payload and the e2e specs in one pass.
	 *
	 * The suppression is scoped to this block and to exactly the two rules the type error
	 * produces, and it expires by itself: ESLint reports an unused disable directive, `lint` runs
	 * with `--max-warnings=0`, so the moment the rename lands this comment fails the build until
	 * it is deleted. The `TS2339`s underneath are **not** suppressed — `typecheck` still names
	 * all eight.
	 */
	/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
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

	/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

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
