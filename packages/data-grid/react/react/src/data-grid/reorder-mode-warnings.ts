import { useEffect } from 'react'

import { wantsDrag } from '../utils/reorder-mode'

import type { ResolvedGridOptions } from '../resolved-options'

const IS_DEV = process.env.NODE_ENV !== 'production'

/**
 * Say so, in development, when a surface asked for a grip by name and the grid has no adapter.
 *
 * Silent otherwise, which is the whole reason this exists: a `'drag'` that no adapter backs falls
 * back to the step pair and looks exactly like a grid whose author never asked for drag. Not
 * catchable in the types — the adapter is a runtime binding one layer above `useDataGrid`, which is
 * also why this is not core's `REQUIRED_FEATURE` warning.
 *
 * Called once, from the grid root, rather than from each surface: a header asks per cell, so a
 * per-surface call would warn once per column. In an effect so that a re-render on an unrelated
 * state slice does not repeat it, and keyed on each condition so a fixed config stops warning.
 */
export function useReorderModeWarnings(grid: ResolvedGridOptions, hasAdapter: boolean): void {
	const header = !hasAdapter && wantsDrag(grid.ordering.header.mode)
	const panel = !hasAdapter && wantsDrag(grid.ordering.visibilityMenu.mode)
	const sort = !hasAdapter && wantsDrag(grid.sortReorder)

	useEffect(() => {
		if (IS_DEV && header) warnDragWithoutAdapter('ordering.column.header', 'the header')
	}, [header])
	useEffect(() => {
		if (IS_DEV && panel) warnDragWithoutAdapter('ordering.column.visibilityMenu', 'the column panel')
	}, [panel])
	useEffect(() => {
		if (IS_DEV && sort) warnDragWithoutAdapter('sorting.multi.reorderable', 'the sort builder')
	}, [sort])
}

function warnDragWithoutAdapter(option: string, surface: string): void {
	console.warn(
		`\`${option}\` asks for a drag handle, but this grid has no drag-and-drop adapter, so ${surface} ` +
			"offers the step controls instead. Bind one with `createDataGrid({ dnd })`, or write `'step'`.",
	)
}
