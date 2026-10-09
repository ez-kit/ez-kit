import type { DataTable, GridFeatures } from '../types'
import type { Header } from '@tanstack/table-core'

const TABLE_SELECTOR = '[data-slot="table"]'
const HEADER_CELL_SELECTOR = '[data-slot="th"]'
const RELEASE_EVENTS = ['mouseup', 'touchend', 'touchcancel'] as const

type ColumnWidths = Record<string, number>

/**
 * Writes the width every visible column renders at into `columnSizing`, before a drag starts, and
 * returns what it wrote.
 *
 * Two reasons, one write. A column that fills the free width renders wider than its starting
 * width, but TanStack starts a drag from the width in state — so without this the dragged column
 * snaps back to its starting width on the first move. And a column in `columnSizing` gets a fixed
 * track (see `getGridTemplateColumns`), so fixing **every** filling column, not only the dragged
 * one, is what keeps a drag to the one column: otherwise the width it gives up or takes flows into
 * the columns still filling, and the user watches a neighbour's edge move.
 *
 * Only widths that differ from the one in state are written, so a column that is already fixed
 * leaves `columnSizing` untouched. Under a controlled `columnSizing` the write reaches the table
 * through the consumer's `onChange` on the next render, which is too late for this drag.
 */
export function freezeRenderedWidths<TRow extends object>(
	table: DataTable<GridFeatures, TRow>,
	from: Element,
): ColumnWidths {
	const tableEl = from.closest(TABLE_SELECTOR)
	if (tableEl === null) return {}
	const headerCells = Array.from(tableEl.querySelectorAll<HTMLElement>(HEADER_CELL_SELECTOR))

	const rendered: ColumnWidths = {}
	for (const column of table.getVisibleLeafColumns()) {
		const cell = headerCells.find((candidate) => candidate.dataset.columnId === column.id)
		if (cell === undefined) continue
		const width = Math.round(cell.getBoundingClientRect().width * 100) / 100
		if (width > 0 && width !== column.getSize()) rendered[column.id] = width
	}

	if (Object.keys(rendered).length > 0) table.setColumnSizing((old) => ({ ...old, ...rendered }))
	return rendered
}

/**
 * Takes back what {@link freezeRenderedWidths} wrote when the press on `header`'s handle never
 * became a drag, once the pointer comes up.
 *
 * A press that does not move the column is not a resize, and must not leave the grid fixed at the
 * widths it happened to render at. A drag that did move it keeps every frozen width: that is what
 * stops the columns around it from refilling. Call this **after** starting TanStack's resize, so
 * its own release listener — which commits the final width in `onEnd` mode — runs first.
 */
export function releaseUnmovedWidths<TRow extends object>(
	table: DataTable<GridFeatures, TRow>,
	header: Header<GridFeatures, TRow>,
	frozen: ColumnWidths,
	doc: Document,
): void {
	if (Object.keys(frozen).length === 0) return
	const dragged = header.getLeafHeaders().map(({ column }) => column)
	const startWidths = dragged.map((column) => column.getSize())

	const release = (): void => {
		for (const type of RELEASE_EVENTS) doc.removeEventListener(type, release)
		const hasMoved = dragged.some((column, index) => column.getSize() !== startWidths[index])
		if (hasMoved) return
		table.setColumnSizing((old) => {
			const kept = Object.entries(old).filter(([id, width]) => frozen[id] !== width)
			return kept.length === Object.keys(old).length ? old : Object.fromEntries(kept)
		})
	}
	for (const type of RELEASE_EVENTS) doc.addEventListener(type, release)
}
