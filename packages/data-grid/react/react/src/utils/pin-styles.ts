import type { Column, RowData } from '@tanstack/table-core'
import type { CSSProperties } from 'react'

/**
 * Returns inline CSSProperties for sticky column pinning.
 * Use on both `<th>` and `<td>` to keep columns pinned during horizontal scroll.
 */
export function getCommonPinStyles<TData extends RowData>(column: Column<TData>): CSSProperties {
	const isPinned = column.getIsPinned()
	if (!isPinned) return {}
	return {
		position: 'sticky',
		left: isPinned === 'left' ? `${String(column.getStart('left'))}px` : undefined,
		right: isPinned === 'right' ? `${String(column.getAfter('right'))}px` : undefined,
		zIndex: 1,
	}
}
