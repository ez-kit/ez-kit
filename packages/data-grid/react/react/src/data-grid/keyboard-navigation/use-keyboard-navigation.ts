import { GridDirection } from '@ez-kit/data-grid-core'
import { useCallback, useLayoutEffect, useRef } from 'react'

import { isTextEntryTarget } from '../../utils/text-entry-target'

import {
	addressOf,
	cellOf,
	cellsOf,
	elementAt,
	enteredCellOf,
	firstFocusableIn,
	focusablesIn,
	ROVING_ATTR,
	rowsOf,
} from './dom'

import type { CellAddress } from './dom'
import type { KeyboardEvent, FocusEvent, RefObject } from 'react'

/** How far `PageUp` / `PageDown` travel. A screenful is not knowable here; a row count is. */
const PAGE_ROWS = 10

/** Marks the cell currently open for editing — the editor owns `Escape` and `Enter` there. */
const EDITING_CELL_ATTR = 'data-editing-cell'

/** What a grid with the focus model spreads onto the kit's `Table`. */
export type GridNavigationProps = {
	role?: 'grid'
	onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
	onFocus?: (event: FocusEvent<HTMLElement>) => void
}

type Options = {
	/** `false` in a kit that brings its own focus manager — see `createDataGrid`. */
	enabled: boolean
	/** The grid's outer box. Every query below is scoped to it. */
	rootRef: RefObject<HTMLElement | null>
	/** The element that scrolls, for the one case a move runs past what is mounted. */
	scrollRef: RefObject<HTMLElement | null>
	direction: GridDirection
}

/**
 * The grid's own focus model: one tab stop for the whole grid, arrows between cells, `Enter` to
 * reach a cell's controls and `Escape` to come back out.
 *
 * **It is opt-in per kit, and deliberately not a config option.** HeroUI's table is React Aria's,
 * which brings a roving focus manager of its own; a second one there would fight it for the arrow
 * keys, and a `keyboard: false` that changed nothing in that kit would be an option that silently
 * does nothing — the defect class this repo already warns about for unregistered features. So the
 * switch is `createDataGrid({ keyboardNavigation })`, a statement by the kit about what it brings,
 * beside `components` and `features`.
 *
 * Everything here is imperative. Cells render a static `tabIndex={-1}`, and the single tab stop is
 * moved by writing `tabIndex` on one element — so an arrow press re-renders nothing at all, where
 * holding the address in React state would re-render every cell of the grid on every keystroke.
 * The layout effect below re-applies the stop after each render, since React owns the attribute
 * in the JSX and would otherwise hand it back to the first cell on the next sort or page change.
 *
 * What it must not take:
 * - `Alt+Arrow` — column and row reordering own that chord (`header-cell.tsx`, `row.tsx`).
 * - anything while a cell is open for editing — `cell.tsx` runs a document-level `Enter` / `Escape`
 *   pair for the editor, and it bails on `defaultPrevented`.
 * - anything raised inside a cell's own controls, apart from `Escape`, which is the way back out.
 */
export function useGridKeyboardNavigation({ enabled, rootRef, scrollRef, direction }: Options): GridNavigationProps {
	/** Where the tab stop is. Clamped on read, never trusted to still exist. */
	const addressRef = useRef<CellAddress>({ row: 0, cell: 0 })

	const applyTabStop = useCallback(() => {
		const root = rootRef.current
		if (!root) return
		const rows = rowsOf(root)
		if (rows.length === 0) return
		const address = addressRef.current
		const row = Math.min(address.row, rows.length - 1)
		const target = elementAt(root, { row, cell: address.cell })
		for (const previous of root.querySelectorAll<HTMLElement>(`[${ROVING_ATTR}]`)) {
			if (previous === target) continue
			previous.removeAttribute(ROVING_ATTR)
			previous.tabIndex = -1
		}
		if (!target) return
		target.setAttribute(ROVING_ATTR, '')
		target.tabIndex = 0

		/**
		 * Take every control inside a cell out of the tab order, and give them back only to the
		 * cell the caret has entered.
		 *
		 * This is what actually collapses the grid to one tab stop, and without it the rest of
		 * the model buys nothing measurable: the cells become reachable, but `Tab` still walks
		 * every sort trigger, checkbox and menu button in turn — which is the 10-to-14 stops
		 * the audit counted, now with cells added to them rather than replacing them.
		 *
		 * `tabIndex = -1` does not stop `.focus()`, which is how `Enter` reaches the first
		 * control, and it does not reach a menu or a dialog the kit renders in a portal — those
		 * are outside the cell in the DOM and keep their own focus handling.
		 *
		 * Written on every render for the same reason the tab stop is: React owns the attribute
		 * on anything it renders, so a sort or a page change hands it straight back.
		 */
		const entered = enteredCellOf(root)
		for (const row of rows) {
			for (const cell of cellsOf(row)) {
				const wanted = cell === entered ? 0 : -1
				for (const control of focusablesIn(cell)) {
					if (control.tabIndex !== wanted) control.tabIndex = wanted
				}
			}
		}
	}, [rootRef])

	// No dependency array: the tab stop has to survive every render that replaces cells — a sort,
	// a filter, a page change, a virtualized scroll. The body is two queries over one grid.
	useLayoutEffect(() => {
		if (enabled) applyTabStop()
	})

	const focusCell = useCallback(
		(address: CellAddress) => {
			const root = rootRef.current
			if (!root) return false
			const target = elementAt(root, address)
			if (!target) return false
			addressRef.current = { row: address.row, cell: address.cell }
			applyTabStop()
			target.focus()
			return true
		},
		[applyTabStop, rootRef],
	)

	/**
	 * A vertical move that ran past the mounted rows.
	 *
	 * Under virtualization the row simply does not exist yet, so the scrollport is nudged by a
	 * row's height and the move retried once the next frame has rendered the window. A
	 * non-virtualized grid is already whole, so the scroll changes nothing and the retry finds
	 * the same bound — which is the correct "stay put" for the first and last row.
	 */
	const scrollAndRetry = useCallback(
		(address: CellAddress, delta: number) => {
			const scrollEl = scrollRef.current
			const root = rootRef.current
			if (!scrollEl || !root) return
			const step = rowsOf(root).at(delta > 0 ? -1 : 0)?.offsetHeight
			if (step === undefined || step === 0) return
			scrollEl.scrollTop += delta > 0 ? step : -step
			requestAnimationFrame(() => {
				focusCell(address)
			})
		},
		[focusCell, rootRef, scrollRef],
	)

	const move = useCallback(
		(rowDelta: number, cellDelta: number) => {
			const root = rootRef.current
			if (!root) return
			const current = addressRef.current
			const rows = rowsOf(root)
			const rowIndex = Math.min(current.row, rows.length - 1)
			const rowEl = rows[rowIndex]
			if (!rowEl) return
			if (cellDelta !== 0) {
				const cells = cellsOf(rowEl)
				const next = Math.min(Math.max(current.cell + cellDelta, 0), cells.length - 1)
				focusCell({ row: rowIndex, cell: next })
				return
			}
			const next = { row: rowIndex + rowDelta, cell: current.cell }
			if (next.row < 0 || next.row > rows.length - 1) {
				scrollAndRetry({ row: Math.min(Math.max(next.row, 0), rows.length - 1), cell: current.cell }, rowDelta)
				return
			}
			focusCell(next)
		},
		[focusCell, rootRef, scrollAndRetry],
	)

	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			// `Alt+Arrow` moves a column or a row. Yielding the whole chord — rather than only the
			// arrow keys — keeps this from having to know which chords the reorder handlers grew.
			if (event.altKey) return
			const root = rootRef.current
			if (!root) return
			const cell = cellOf(event.target)
			if (!cell) return

			if (event.target !== cell) {
				// Inside the cell's own controls. `Escape` is the way back to the cell, and nothing
				// else here is ours — a text field owns its arrows, a menu owns its own keys.
				if (event.key !== 'Escape') return
				// The editor's own `Escape` cancels the edit; taking it here would swallow that.
				if (cell.hasAttribute(EDITING_CELL_ATTR)) return
				event.preventDefault()
				const address = addressOf(root, cell)
				if (address) focusCell(address)
				// Left the cell: its controls go back out of the tab order.
				applyTabStop()
				return
			}

			// A cell itself is never a text-entry target, but a kit is free to render one as the
			// cell element, and a grid that ate the caret's arrow keys would be worse than one
			// with no navigation at all.
			if (isTextEntryTarget(event)) return

			const rows = rowsOf(root)
			const rowEl = rows[Math.min(addressRef.current.row, rows.length - 1)]
			const forward = direction === GridDirection.Rtl ? -1 : 1

			switch (event.key) {
				case 'ArrowRight':
					move(0, forward)
					break
				case 'ArrowLeft':
					move(0, -forward)
					break
				case 'ArrowDown':
					move(1, 0)
					break
				case 'ArrowUp':
					move(-1, 0)
					break
				case 'PageDown':
					move(PAGE_ROWS, 0)
					break
				case 'PageUp':
					move(-PAGE_ROWS, 0)
					break
				case 'Home':
					if (event.ctrlKey || event.metaKey) focusCell({ row: 0, cell: 0 })
					else focusCell({ row: addressRef.current.row, cell: 0 })
					break
				case 'End': {
					const lastRow = event.ctrlKey || event.metaKey ? rows.length - 1 : addressRef.current.row
					const lastCells = cellsOf(rows[lastRow] ?? rowEl ?? root)
					focusCell({ row: lastRow, cell: Math.max(lastCells.length - 1, 0) })
					break
				}
				case 'Enter':
				case 'F2': {
					const control = firstFocusableIn(cell)
					if (!control) return
					event.preventDefault()
					control.focus()
					// The cell is entered now, so its controls rejoin the tab order and `Tab` moves
					// between them rather than leaving the grid.
					applyTabStop()
					return
				}
				default:
					return
			}
			// Every move above scrolls the grid if it let the arrow through to the page.
			event.preventDefault()
		},
		[applyTabStop, direction, focusCell, move, rootRef],
	)

	/**
	 * Focus that arrived some other way — a click on a cell, a click on a control inside one, a
	 * `Tab` back into the grid. The tab stop follows it, so leaving and re-entering returns to
	 * where the user was rather than to the first cell.
	 */
	const onFocus = useCallback(
		(event: FocusEvent<HTMLElement>) => {
			const root = rootRef.current
			if (!root) return
			const cell = cellOf(event.target)
			if (!cell) return
			const address = addressOf(root, cell)
			if (!address) return
			addressRef.current = address
			applyTabStop()
		},
		[applyTabStop, rootRef],
	)

	if (!enabled) return {}
	return { role: 'grid', onKeyDown, onFocus }
}
