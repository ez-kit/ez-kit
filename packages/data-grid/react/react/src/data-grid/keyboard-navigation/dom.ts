/**
 * The DOM queries the focus model is built on.
 *
 * Addressing is by **document position**, not by a `(rowIndex, columnIndex)` pair threaded
 * through the components. Three reasons, all structural:
 *
 * - `ThProps` / `TdProps` carry no `RefAttributes` (`types.ts`), so there is no ref to a cell to
 *   hold on to; the package already reaches an open editor this way (`cell.tsx` queries
 *   `[data-editing-cell]`).
 * - Body rows arrive in three groups — pinned top, centre, pinned bottom — rendered in that
 *   order, so document order **is** visual order and no group bookkeeping is needed.
 * - Under virtualization an off-screen row has no element at all, so an index would have to be
 *   mapped through the virtualizer on every move. Document order degrades honestly instead: the
 *   move lands on what is mounted, and the caller scrolls when it runs out.
 */

/** Candidate rows, header rows included, in visual order. A footer is not navigable. */
const ROW_SELECTOR = '[data-slot="thead"] [data-slot="tr"], [data-slot="tbody"] [data-slot="tr"]'

/**
 * A navigable cell — addressed by the **role the model itself wrote**, not by `data-slot`.
 *
 * That is what keeps the filler rows out without a list of them: the loading skeleton, the empty
 * state, the no-results row and the draft creating row all render `data-slot='td'`, and none of
 * them takes a role or a `tabIndex` from `useCellNavigationProps`. Selecting on the role means
 * the model navigates exactly what it marked, and a row holding none of them is skipped whole
 * (see {@link rowsOf}) rather than swallowing an arrow press on a cell that cannot take focus.
 */
const CELL_SELECTOR = '[role="gridcell"], [role="columnheader"]'

/**
 * What a cell hands the caret to when it is entered. Shares its shape with `cell.tsx`'s
 * constant of the same job — an editor focuses its own first control, and this focuses a cell's.
 */
const FOCUSABLE_SELECTOR =
	'input, select, textarea, button, a[href], [contenteditable="true"], [tabindex]:not([tabindex="-1"])'

/** Marks the cell currently holding the grid's single tab stop. */
export const ROVING_ATTR = 'data-grid-focus'

export type CellAddress = { row: number; cell: number }

export function rowsOf(root: HTMLElement): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(ROW_SELECTOR)].filter(
		(row) => row.querySelector(CELL_SELECTOR) !== null,
	)
}

export function cellsOf(row: HTMLElement): HTMLElement[] {
	return [...row.querySelectorAll<HTMLElement>(CELL_SELECTOR)]
}

/** The cell an event started in, or `null` when the event came from outside the grid's cells. */
export function cellOf(target: EventTarget | null): HTMLElement | null {
	return target instanceof Element ? target.closest<HTMLElement>(CELL_SELECTOR) : null
}

/** Where `cell` sits, or `null` when it is no longer in the tree. */
export function addressOf(root: HTMLElement, cell: HTMLElement): CellAddress | null {
	const rows = rowsOf(root)
	const rowEl = cell.closest<HTMLElement>('[data-slot="tr"]')
	if (!rowEl) return null
	const row = rows.indexOf(rowEl)
	if (row < 0) return null
	const index = cellsOf(rowEl).indexOf(cell)
	return index < 0 ? null : { row, cell: index }
}

/** The element at `address`, clamped to the row's own cell count, or `null` if nothing is there. */
export function elementAt(root: HTMLElement, address: CellAddress): HTMLElement | null {
	const rowEl = rowsOf(root)[address.row]
	if (!rowEl) return null
	const cells = cellsOf(rowEl)
	// Rows differ in cell count only under grouped headers, where a header row spans several
	// columns with one cell. Clamping keeps a vertical move from falling out of the grid there.
	return cells[Math.min(address.cell, cells.length - 1)] ?? null
}

/** True when the caret is inside a cell's own controls rather than on the cell. */
/** The first control inside `cell`, in document order, or `null` when the cell holds none. */
export function firstFocusableIn(cell: HTMLElement): HTMLElement | null {
	return cell.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
}

/** Every control inside `cell`, in document order. */
export function focusablesIn(cell: HTMLElement): HTMLElement[] {
	return [...cell.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
}

/** The cell whose own controls currently hold the caret, or `null` when the caret is on a cell. */
export function enteredCellOf(root: HTMLElement): HTMLElement | null {
	const active = root.ownerDocument.activeElement
	if (!(active instanceof HTMLElement) || !root.contains(active)) return null
	const cell = cellOf(active)
	return cell === null || cell === active ? null : cell
}
