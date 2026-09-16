import { ColumnPinSide } from '@ez-kit/data-grid-core'

import type { GridFeatures } from '../types'
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
 * Pair this with `data-pinned="start" | "end"` on the same element so the
 * structural CSS can apply positioning.
 */
export function getCommonPinStyles<TData extends RowData>(column: Column<GridFeatures, TData>): CSSProperties {
	const isPinned = column.getIsPinned()
	if (!isPinned) return {}
	const vars: CSSProperties = {}
	// Logical, not physical: `getStart` / `getAfter` measure from the inline-start / inline-end
	// edge of the pin group, so the structural sheet applies them as `inset-inline-start` /
	// `inset-inline-end` and the offsets need no adjustment under RTL.
	if (isPinned === ColumnPinSide.Start) {
		;(vars as Record<string, string>)['--dg-pin-start'] = `${String(column.getStart(ColumnPinSide.Start))}px`
	}
	if (isPinned === ColumnPinSide.End) {
		;(vars as Record<string, string>)['--dg-pin-end'] = `${String(column.getAfter(ColumnPinSide.End))}px`
	}
	return vars
}
