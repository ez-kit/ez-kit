import { getVisualLeafColumns } from './visual-column-order'

import type { DataTable, GridFeatures } from '../types'
import type { Column, ColumnSizingState } from '@tanstack/table-core'
import type { CSSProperties } from 'react'

/**
 * Builds a CSS custom property map for all column widths.
 * Set these on `<table style={vars}>` so that `<th>` / `<td>` can read
 * widths via `calc(var(--header-{id}-size) * 1px)` without per-cell re-renders.
 *
 * Also emits `--dg-table-min-width` — the summed width of the visible leaf columns,
 * i.e. the narrowest the row grid can ever be. The structural stylesheet floors the
 * table box at it, which is load-bearing for column pinning: the rows carry the column
 * grid but are laid out as *block* boxes, so without a floor the table box is only as
 * wide as the scrollport while its grid tracks overflow it. `position: sticky` is
 * clamped to its containing block — that too-narrow row — so past
 * `scrollWidth − rowWidth` the browser drags every left-pinned cell out of the
 * scrollport along with the content, leaving behind only the pin shadow (which sits on
 * the wrapper and is never clamped).
 */
export function getColumnSizeVars<TRow extends object>(table: DataTable<GridFeatures, TRow>): CSSProperties {
	const headers = table.getFlatHeaders()
	const vars: Record<string, string> = {}

	for (const header of headers) {
		const colId = header.column.id
		vars[`--header-${colId}-size`] = String(header.getSize())
		vars[`--col-${colId}-size`] = String(header.column.getSize())
	}

	const { columnSizing } = table.store.state
	const minWidth = table
		.getVisibleLeafColumns()
		.reduce((acc, col) => acc + (isFixedTrack(col, columnSizing) ? col.getSize() : getFillFloor(col)), 0)
	vars['--dg-table-min-width'] = `${String(minWidth)}px`

	return vars
}

/**
 * Whether a column states a `max` width. TanStack's default column def gives every column
 * `maxSize: Number.MAX_SAFE_INTEGER`, so a column without one still carries that sentinel.
 */
function hasMaxWidth(maxSize: number | undefined): maxSize is number {
	return maxSize !== undefined && maxSize < Number.MAX_SAFE_INTEGER
}

/**
 * Whether a column keeps an exact width rather than filling the grid's free width:
 * - its author named a starting width (`width: 60`, `width: { default: 60 }`);
 * - it is pinned or a system column — sticky offsets depend on exact widths;
 * - it has `resizing: false`, which pins its width;
 * - the user has resized it (an entry in `columnSizing`), which a drag does to every column so
 *   that it moves the one being dragged and no neighbour.
 */
function isFixedTrack<TRow extends object>(col: Column<GridFeatures, TRow>, columnSizing: ColumnSizingState): boolean {
	const { meta, enableResizing } = col.columnDef
	return (
		meta?.width?.default !== undefined ||
		Boolean(col.getIsPinned()) ||
		Boolean(meta?.isSystemColumn) ||
		enableResizing === false ||
		Object.hasOwn(columnSizing, col.id)
	)
}

/**
 * The narrowest a filling column gets: its `min`, or TanStack's default width when it names
 * none — a column with neither would otherwise be crushed to TanStack's 20px floor before the
 * grid scrolls.
 */
function getFillFloor<TRow extends object>(col: Column<GridFeatures, TRow>): number {
	return col.columnDef.meta?.width?.min ?? col.getSize()
}

/**
 * Builds the `grid-template-columns` value from visible leaf columns.
 *
 * A fixed column (see {@link isFixedTrack}) gets its exact width. Every other column fills the
 * grid's free width from {@link getFillFloor} up: `minmax(floor, 1fr)`, or `minmax(floor, max)`
 * when it has a `max` — a `fr` track cannot be capped, and a bounded track grows to its limit
 * before the `fr` tracks share what is left. When every column is fixed nothing fills, and the
 * row's background carries on past the last track.
 *
 * The tracks follow {@link getVisualLeafColumns} — start, centre, end — because that
 * is the order the cells that occupy them are rendered in.
 */
export function getGridTemplateColumns<TRow extends object>(table: DataTable<GridFeatures, TRow>): string {
	const { columnSizing } = table.store.state
	return getVisualLeafColumns(table)
		.map((col) => {
			const size = `calc(var(--col-${col.id}-size) * 1px)`
			if (isFixedTrack(col, columnSizing)) return size
			// Without a `min`, the floor is the column's size — read through its variable like a fixed
			// track, so the two stay one value.
			const min = col.columnDef.meta?.width?.min
			const floor = min === undefined ? size : `${String(min)}px`
			const { maxSize } = col.columnDef
			return hasMaxWidth(maxSize) ? `minmax(${floor}, ${String(maxSize)}px)` : `minmax(${floor}, 1fr)`
		})
		.join(' ')
}
