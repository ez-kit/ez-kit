import { createColumns } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { renderGrid, TEST_ROWS } from '../test-utils'

import type { TestRow } from '../test-utils'

/**
 * `column.footer` used to be the one column option that did nothing on its own: it reached
 * TanStack, `<DataGrid.Footer />` could render it, and the default layout mounted neither — so a
 * column declared a footer and nothing appeared. Every other column option (`align`, `width`,
 * `pinning`, `cell`, the `*ClassName`s) works by being declared, and this one now does too.
 */
const FOOTER_COLUMNS = createColumns<TestRow>([
	{ accessorKey: 'name', header: 'Name', footer: 'Total' },
	{
		accessorKey: 'age',
		header: 'Age',
		align: 'end',
		footerClassName: 'font-medium',
		footer: ({ table }) => table.getFilteredRowModel().rows.reduce((sum, row) => sum + row.original.age, 0),
	},
])

const PLAIN_COLUMNS = createColumns<TestRow>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
])

const TOTAL_AGE = String(TEST_ROWS.reduce((sum, row) => sum + row.age, 0))

describe('layout.footer', () => {
	it('mounts the footer in the default layout when a column declares one', () => {
		const { container } = renderGrid({ columns: FOOTER_COLUMNS })
		const cells = container.querySelectorAll('tfoot td')
		expect(Array.from(cells).map((cell) => cell.textContent)).toEqual(['Total', TOTAL_AGE])
	})

	it('carries the column’s alignment and footer class onto the footer cell', () => {
		const { container } = renderGrid({ columns: FOOTER_COLUMNS })
		const total = container.querySelectorAll('tfoot td')[1]
		expect(total?.getAttribute('data-align')).toBe('end')
		expect(total?.className).toContain('font-medium')
	})

	it('mounts no footer when no column declares one', () => {
		const { container } = renderGrid({ columns: PLAIN_COLUMNS })
		expect(container.querySelector('tfoot')).toBeNull()
	})

	it('false opts out even though the columns declare footers', () => {
		const { container } = renderGrid({ columns: FOOTER_COLUMNS, layout: { footer: false } })
		expect(container.querySelector('tfoot')).toBeNull()
	})

	it('true mounts the footer before any column declares one', () => {
		const { container } = renderGrid({ columns: PLAIN_COLUMNS, layout: { footer: true } })
		expect(container.querySelectorAll('tfoot td')).toHaveLength(PLAIN_COLUMNS.length)
	})
})

describe('layout.stickyFooter', () => {
	it('marks the tfoot sticky and opens the vertical scroll bound', () => {
		const { container } = renderGrid({ columns: FOOTER_COLUMNS, layout: { stickyFooter: true } })
		expect(container.querySelector("[data-slot='tfoot'][data-sticky='true']")).not.toBeNull()
		expect(container.querySelector("[data-slot='table-scroll'][data-sticky-footer='true']")).not.toBeNull()
	})

	it('leaves the tfoot unmarked by default', () => {
		const { container } = renderGrid({ columns: FOOTER_COLUMNS })
		expect(container.querySelector("[data-slot='tfoot']")).not.toBeNull()
		expect(container.querySelector("[data-slot='tfoot'][data-sticky='true']")).toBeNull()
	})
})
