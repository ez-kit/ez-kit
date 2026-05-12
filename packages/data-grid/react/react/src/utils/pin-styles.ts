import type { Column, RowData } from '@tanstack/table-core'
import type { CSSProperties } from 'react'

/**
 * Returns a CSS custom property map for sticky column pinning offsets.
 *
 * Pure data — no `position`, `z-index`, or other visual rules. The actual
 * `position: sticky` and offset application live in the structural stylesheet
 * shipped with this package (`@ez-kit/data-grid-react/styles.css`), which
 * targets `[data-pinned]` and reads these variables.
 *
 * Pair this with `data-pinned="left" | "right"` on the same element so the
 * structural CSS can apply positioning.
 */
export function getCommonPinStyles<TData extends RowData>(column: Column<TData>): CSSProperties {
	const isPinned = column.getIsPinned()
	if (!isPinned) return {}
	const vars: CSSProperties = {}
	if (isPinned === 'left') {
		;(vars as Record<string, string>)['--dg-pin-left'] = `${String(column.getStart('left'))}px`
	}
	if (isPinned === 'right') {
		;(vars as Record<string, string>)['--dg-pin-right'] = `${String(column.getAfter('right'))}px`
	}
	return vars
}
