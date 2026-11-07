import { ColumnPinSide } from '@ez-kit/data-grid-core'

import { useDataGridState } from '../data-grid/table-context'

import { shallow } from './shallow-equal'

import type { GridFeatures } from '../types'
import type { Column } from '@tanstack/table-core'
import type { CSSProperties } from 'react'

/** Observe the rendered geometry, including offsets changed by a pinned neighbour's width. */
export function useColumnPin<TRow extends object>(column: Column<GridFeatures, TRow>) {
	const { pinned, start, end } = useDataGridState(
		() => {
			const pinned = column.getIsPinned()
			return {
				pinned,
				start: pinned === ColumnPinSide.Start ? column.getStart(ColumnPinSide.Start) : undefined,
				end: pinned === ColumnPinSide.End ? column.getAfter(ColumnPinSide.End) : undefined,
			}
		},
		{ compare: shallow },
	)
	const pinVars: CSSProperties = {}
	if (start !== undefined) (pinVars as Record<string, string>)['--dg-pin-start'] = `${String(start)}px`
	if (end !== undefined) (pinVars as Record<string, string>)['--dg-pin-end'] = `${String(end)}px`
	return { pinned, pinVars }
}
