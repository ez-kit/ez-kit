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
 * Pair this with `data-pinned="left" | "right"` on the same element so the
 * structural CSS can apply positioning.
 */
export function getCommonPinStyles<TData extends RowData>(column: Column<GridFeatures, TData>): CSSProperties {
	const isPinned = column.getIsPinned()
	if (!isPinned) return {}
	const vars: CSSProperties = {}
	// The **comparison** follows core's v9 vocabulary (`start` / `end`), because that is what
	// `getIsPinned()` can return — `ColumnPinSide.Left` was removed in PR 1 and comparing against
	// it matched nothing. The **variable names** stay `--dg-pin-left` / `--dg-pin-right`: those
	// are the DOM contract both kits' stylesheets and the e2e specs target, and they flip with
	// the kits in PR 3, not here.
	if (isPinned === ColumnPinSide.Start) {
		;(vars as Record<string, string>)['--dg-pin-left'] = `${String(column.getStart(ColumnPinSide.Start))}px`
	}
	if (isPinned === ColumnPinSide.End) {
		;(vars as Record<string, string>)['--dg-pin-right'] = `${String(column.getAfter(ColumnPinSide.End))}px`
	}
	return vars
}
