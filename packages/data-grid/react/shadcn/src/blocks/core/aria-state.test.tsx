import { createColumns } from '@ez-kit/data-grid-core'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataGrid } from '../../data-grid'

type Row = { id: number; name: string }

// More rows than the default page, so a grid sliced to its first page is unmistakable.
const ROWS: Row[] = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, name: `Row ${String(index + 1)}` }))
const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

describe('the prebuilt DataGrid', () => {
	// It binds the all-in feature set, `paginatedRowModel` included, and this grid never mentions
	// `pagination`: every row is shown and none of them needs an index or a count.
	it('shows every row of an unpaged grid and puts no aria-rowcount on it', () => {
		const { container } = render(
			<DataGrid
				data={ROWS}
				columns={COLUMNS}
			/>,
		)

		expect(container.querySelectorAll('[data-slot="tbody"] [data-slot="tr"]')).toHaveLength(25)
		expect(container.querySelector('[data-slot="table"]')?.hasAttribute('aria-rowcount')).toBe(false)
	})
})
