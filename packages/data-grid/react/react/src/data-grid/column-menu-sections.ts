import { GridMenuIcon, toMenuSections } from '../menu'

import type { GridMenuSection } from '../menu'
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
} as const

export type ColumnActionId = (typeof ColumnActionId)[keyof typeof ColumnActionId]

const LABELS: Record<ColumnActionId, string> = {
	[ColumnActionId.SortAsc]: 'Asc',
	[ColumnActionId.SortDesc]: 'Desc',
	[ColumnActionId.ClearSort]: 'Clear sort',
	[ColumnActionId.PinLeft]: 'Pin Left',
	[ColumnActionId.PinRight]: 'Pin Right',
	[ColumnActionId.Unpin]: 'Unpin',
	[ColumnActionId.Hide]: 'Hide',
}

const SORTING_SECTION = 'sorting'
const PIN_SECTION = 'pin'
const VISIBILITY_SECTION = 'visibility'

export type ColumnMenuCapabilities = {
	canSort: boolean
	canPin: boolean
	canHide: boolean
}

/**
 * Turns a header plus what the grid allows on it into the menu the kit renders.
 *
 * The wording and the grouping live here — they are content, identical across kits — while
 * the trigger, the icons and the chrome stay in each kit. Sections with no entries are
 * dropped, so an empty result means "render no menu at all".
 */
export function buildColumnMenuSections(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	header: Header<any, unknown>,
	{ canSort, canPin, canHide }: ColumnMenuCapabilities,
): GridMenuSection[] {
	const column = header.column
	const sortDir = column.getIsSorted()
	const isPinned = column.getIsPinned()

	const sorting: GridMenuSection = { id: SORTING_SECTION, label: 'Sorting', items: [] }
	if (canSort) {
		if (sortDir !== 'asc') {
			sorting.items.push({
				id: ColumnActionId.SortAsc,
				label: LABELS[ColumnActionId.SortAsc],
				icon: GridMenuIcon.SortAsc,
				onSelect: () => {
					column.toggleSorting(false)
				},
			})
		}
		if (sortDir !== 'desc') {
			sorting.items.push({
				id: ColumnActionId.SortDesc,
				label: LABELS[ColumnActionId.SortDesc],
				icon: GridMenuIcon.SortDesc,
				onSelect: () => {
					column.toggleSorting(true)
				},
			})
		}
		if (sortDir) {
			sorting.items.push({
				id: ColumnActionId.ClearSort,
				label: LABELS[ColumnActionId.ClearSort],
				icon: GridMenuIcon.ClearSort,
				onSelect: () => {
					column.clearSorting()
				},
			})
		}
	}

	const pin: GridMenuSection = { id: PIN_SECTION, label: 'Pin', items: [] }
	if (canPin) {
		if (isPinned !== 'left') {
			pin.items.push({
				id: ColumnActionId.PinLeft,
				label: LABELS[ColumnActionId.PinLeft],
				icon: GridMenuIcon.PinLeft,
				onSelect: () => {
					column.pin('left')
				},
			})
		}
		if (isPinned !== 'right') {
			pin.items.push({
				id: ColumnActionId.PinRight,
				label: LABELS[ColumnActionId.PinRight],
				icon: GridMenuIcon.PinRight,
				onSelect: () => {
					column.pin('right')
				},
			})
		}
		if (isPinned) {
			pin.items.push({
				id: ColumnActionId.Unpin,
				label: LABELS[ColumnActionId.Unpin],
				icon: GridMenuIcon.Unpin,
				onSelect: () => {
					column.pin(false)
				},
			})
		}
	}

	const visibility: GridMenuSection = { id: VISIBILITY_SECTION, items: [] }
	if (canHide) {
		visibility.items.push({
			id: ColumnActionId.Hide,
			label: LABELS[ColumnActionId.Hide],
			icon: GridMenuIcon.Hide,
			onSelect: () => {
				column.toggleVisibility(false)
			},
		})
	}

	return toMenuSections([sorting, pin, visibility])
}
