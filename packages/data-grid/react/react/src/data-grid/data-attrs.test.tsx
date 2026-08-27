import { createTable, createColumns } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { prepareDataGridTable } from '../prepare-table'
import { renderWithComponents } from '../test-utils'

import { DataGrid } from './data-grid'

import type { ResolvedGridOptions } from '../resolved-options'

type User = { id: number; name: string; age: number }

const USERS: User[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 25 },
]
const COLUMNS = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
])

function makeTable() {
	return createTable<User>({ data: USERS, columns: COLUMNS })
}

/**
 * Helpers that write the resolved options `useDataGrid` would produce with the corresponding
 * feature flag on. These tests build the table directly, so they must go through the table:
 * `prepareDataGridTable` seeds `table.grid`, and seeding it again would drop these writes.
 */
function makeInstance(mutate?: (options: ResolvedGridOptions) => void) {
	const table = prepareDataGridTable(makeTable())
	mutate?.(table.grid)
	return table
}
const withSticky = (options: ResolvedGridOptions) => (options.layout.stickyHeader = true)
const withVirtualized = (options: ResolvedGridOptions) =>
	(options.virtualization = { row: { estimateSize: 40, overscan: 5 } })

describe('headless data-* contract', () => {
	it('table emits data-slot="table" without data-virtualized by default', () => {
		const table = makeTable()
		const { container } = renderWithComponents(<DataGrid table={prepareDataGridTable(table)} />)
		const tableEl = container.querySelector("[data-slot='table']")
		expect(tableEl).not.toBeNull()
		expect(tableEl?.getAttribute('data-virtualized')).toBeNull()
	})

	it('table + tbody emit data-virtualized="true" when virtualization is on', () => {
		const { container } = renderWithComponents(<DataGrid table={makeInstance(withVirtualized)} />)
		expect(container.querySelector("[data-slot='table'][data-virtualized='true']")).not.toBeNull()
		expect(container.querySelector("[data-slot='tbody'][data-virtualized='true']")).not.toBeNull()
	})

	it('thead emits data-sticky="true" when stickyHeader is enabled', () => {
		const { container } = renderWithComponents(<DataGrid table={makeInstance(withSticky)} />)
		expect(container.querySelector("[data-slot='thead'][data-sticky='true']")).not.toBeNull()
	})

	it('thead has no data-sticky when stickyHeader is disabled', () => {
		const table = makeTable()
		const { container } = renderWithComponents(<DataGrid table={prepareDataGridTable(table)} />)
		const thead = container.querySelector("[data-slot='thead']")
		expect(thead?.getAttribute('data-sticky')).toBeNull()
	})

	it('table-scroll emits data-sticky-header="true" when stickyHeader is enabled', () => {
		const { container } = renderWithComponents(<DataGrid table={makeInstance(withSticky)} />)
		expect(container.querySelector("[data-slot='table-scroll'][data-sticky-header='true']")).not.toBeNull()
	})

	it('sortable headers emit data-sortable + data-sort-direction', () => {
		const table = createTable<User>({ data: USERS, columns: COLUMNS, sorting: true })
		const { container } = renderWithComponents(<DataGrid table={prepareDataGridTable(table)} />)
		const triggers = container.querySelectorAll("[data-slot='sort-trigger'][data-sortable='true']")
		expect(triggers.length).toBeGreaterThan(0)
		for (const trigger of triggers) {
			expect(trigger.getAttribute('data-sort-direction')).toBe('none')
		}
	})

	it('pinned columns emit data-pinned on th', () => {
		const COLS_PINNED = createColumns<User>([
			{ accessorKey: 'name', header: 'Name', pinning: { side: 'left' } },
			{ accessorKey: 'age', header: 'Age' },
		])
		const table = createTable<User>({ data: USERS, columns: COLS_PINNED, pinning: { column: true } })
		const { container } = renderWithComponents(<DataGrid table={prepareDataGridTable(table)} />)
		expect(container.querySelector("[data-slot='th'][data-pinned='left']")).not.toBeNull()
	})

	it('renders pin-shadow overlays via data-pin-shadow when columns are pinned', () => {
		const COLS_PINNED = createColumns<User>([
			{ accessorKey: 'name', header: 'Name', pinning: { side: 'left' } },
			{ accessorKey: 'age', header: 'Age' },
		])
		const table = createTable<User>({ data: USERS, columns: COLS_PINNED, pinning: { column: true } })
		const { container } = renderWithComponents(<DataGrid table={prepareDataGridTable(table)} />)
		expect(container.querySelector("[data-pin-shadow='left']")).not.toBeNull()
		expect(container.querySelector("[data-slot='pin-shadow-overlay']")).not.toBeNull()
	})

	// Regression (#42): with >1 pinned column per side the pixel offset must live on
	// each shadow div independently (left = Σ left widths, right = Σ right widths) — NOT
	// as `left`/`right` on a shared overlay box. The shared box was sized to the gap
	// between the pinned blocks and `overflow: hidden`, so once the combined pinned width
	// reached the viewport it collapsed to zero width and clipped BOTH shadows.
	it('positions each pin shadow independently by the summed width of that side (>1 pinned column)', () => {
		const COLS_MULTI = createColumns<User>([
			{ accessorKey: 'name', header: 'Name', size: 180, pinning: { side: 'left' } },
			{ accessorKey: 'age', header: 'Age', size: 120, pinning: { side: 'left' } },
			{ accessorKey: 'id', header: 'Id', size: 90, pinning: { side: 'right' } },
		])
		const table = createTable<User>({ data: USERS, columns: COLS_MULTI, pinning: { column: true } })
		const { container } = renderWithComponents(<DataGrid table={prepareDataGridTable(table)} />)

		const overlay = container.querySelector<HTMLElement>("[data-slot='pin-shadow-overlay']")
		const left = container.querySelector<HTMLElement>("[data-pin-shadow='left']")
		const right = container.querySelector<HTMLElement>("[data-pin-shadow='right']")

		// The offset is carried by each shadow div, summed across that side's pinned columns
		// (left = 180 + 120 = 300; right = 90)…
		expect(left?.style.left).toBe('300px')
		expect(right?.style.right).toBe('90px')
		// …and NOT by the overlay, which must stay a full-size, non-collapsing layer.
		expect(overlay?.style.left).toBe('')
		expect(overlay?.style.right).toBe('')
	})

	// Regression: the summed model widths are only the pre-measurement fallback. Whenever the
	// DOM disagrees — a kit whose scroll container is inset from the wrapper (HeroUI insets it
	// by 4px), or rendered column widths that drift from the model — the model offset puts the
	// shadow's darkest pixels UNDER the sticky pinned cells, which paint above the overlay. The
	// measured edge of the pinned block must win.
	it('positions each pin shadow at the measured DOM edge of its pinned block', () => {
		const COLS_MULTI = createColumns<User>([
			{ accessorKey: 'name', header: 'Name', size: 180, pinning: { side: 'left' } },
			{ accessorKey: 'age', header: 'Age', size: 120, pinning: { side: 'left' } },
			{ accessorKey: 'id', header: 'Id', size: 90, pinning: { side: 'right' } },
		])
		const table = createTable<User>({ data: USERS, columns: COLS_MULTI, pinning: { column: true } })

		// jsdom reports every rect as zero, so stand in a layout where the DOM edges sit 4px
		// past the model ones — the exact drift HeroUI's inset scroll container produces.
		const original = Object.getOwnPropertyDescriptor(Element.prototype, 'getBoundingClientRect')
		Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
			configurable: true,
			value: function rect(this: Element): DOMRect {
				if (this.matches("[data-slot='pin-shadow-overlay']")) return { left: 0, right: 800, width: 800 } as DOMRect
				if (this.matches("[data-slot='th'][data-pinned='left']")) return { right: 304 } as DOMRect
				if (this.matches("[data-slot='th'][data-pinned='right']")) return { left: 706 } as DOMRect
				// Everything else keeps jsdom's own answer, which is a zero rect.
				return { left: 0, right: 0, width: 0 } as DOMRect
			},
		})

		try {
			const { container } = renderWithComponents(<DataGrid table={prepareDataGridTable(table)} />)
			expect(container.querySelector<HTMLElement>("[data-pin-shadow='left']")?.style.left).toBe('304px')
			expect(container.querySelector<HTMLElement>("[data-pin-shadow='right']")?.style.right).toBe('94px')
		} finally {
			if (original) Object.defineProperty(Element.prototype, 'getBoundingClientRect', original)
		}
	})
})
