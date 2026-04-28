import type { Column, RowData, Table } from '@tanstack/table-core'
import type { CSSProperties } from 'react'

/**
 * Returns inline CSSProperties for sticky column pinning.
 * Use on both `<th>` and `<td>` to keep columns pinned during horizontal scroll.
 *
 * Pass `isBoundaryColumn=true` on the last left-pinned or first right-pinned column
 * to render a directional shadow that activates dynamically via CSS custom properties
 * set by the scroll container (`--dg-pin-left-shadow` / `--dg-pin-right-shadow`).
 *
 * Customise shadow colour via `--dg-pin-shadow-color` on any ancestor element.
 */
export function getCommonPinStyles<TData extends RowData>(
	column: Column<TData>,
	isBoundaryColumn = false,
): CSSProperties {
	const isPinned = column.getIsPinned()
	if (!isPinned) return {}
	return {
		position: 'sticky',
		left: isPinned === 'left' ? `${String(column.getStart('left'))}px` : undefined,
		right: isPinned === 'right' ? `${String(column.getAfter('right'))}px` : undefined,
		zIndex: 1,
		backgroundColor: 'var(--background)',
		...(isBoundaryColumn && {
			boxShadow: isPinned === 'left' ? 'var(--dg-pin-left-shadow, none)' : 'var(--dg-pin-right-shadow, none)',
		}),
	}
}

/**
 * Returns true if the column is the boundary pinned column:
 * - last column in the left-pinned group, or
 * - first column in the right-pinned group.
 *
 * Only the boundary column gets a shadow to visually separate
 * the pinned area from the scrollable content.
 */
export function isBoundaryPinnedColumn<TData extends RowData>(
	column: Column<TData>,
	table: Pick<Table<TData>, 'getLeftLeafColumns' | 'getRightLeafColumns'>,
): boolean {
	const pin = column.getIsPinned()
	if (pin === 'left') return table.getLeftLeafColumns().at(-1)?.id === column.id
	if (pin === 'right') return table.getRightLeafColumns().at(0)?.id === column.id
	return false
}
