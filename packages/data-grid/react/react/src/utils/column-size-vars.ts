import type { DataTable } from '@ez-kit/data-grid-core'
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getColumnSizeVars(table: DataTable<any>): CSSProperties {
	const headers = table.getFlatHeaders()
	const vars: Record<string, string> = {}

	for (const header of headers) {
		const colId = header.column.id
		vars[`--header-${colId}-size`] = String(header.getSize())
		vars[`--col-${colId}-size`] = String(header.column.getSize())
	}

	const minWidth = table.getVisibleLeafColumns().reduce((acc, col) => acc + col.getSize(), 0)
	vars['--dg-table-min-width'] = `${String(minWidth)}px`

	return vars
}

/**
 * Builds the `grid-template-columns` value from visible leaf columns.
 * - Resizable tables: fixed pixel widths (drag handles need exact control).
 * - Pinned columns: always fixed (sticky `left`/`right` offsets depend on exact widths).
 * - Center columns without resizing: `minmax(size, 1fr)` so they fill available space.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getGridTemplateColumns(table: DataTable<any>): string {
	const isResizing = Boolean(table.options.enableColumnResizing)
	return table
		.getVisibleLeafColumns()
		.map((col) => {
			const fixed = `calc(var(--col-${col.id}-size) * 1px)`
			const isSystem = Boolean(col.columnDef.meta?.isSystemColumn)
			return isResizing || col.getIsPinned() || isSystem ? fixed : `minmax(${fixed}, 1fr)`
		})
		.join(' ')
}
