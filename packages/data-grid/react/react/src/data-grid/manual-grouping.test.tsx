import { createColumns } from '@ez-kit/data-grid-core'
import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MANUAL_GROUPING, renderGrid, TWO_REGION_TREE } from './manual-grouping-fixtures'

import type { ServerRow } from './manual-grouping-fixtures'

/**
 * End to end: a grid whose rows the **server** already grouped (`TWO_REGION_TREE`), whose group
 * subtotals are fields the server put on the group rows, and whose footer grand total comes from
 * the table config — with no aggregation feature registered at all (`MANUAL_GROUPING` carries no
 * `rowAggregationFeature`, no `aggregationFns`). Everything this suite asserts was already built
 * by earlier tasks in this plan; this file adds no source.
 */
describe('a server-grouped grid', () => {
	const setup = () =>
		renderGrid<ServerRow>({
			features: MANUAL_GROUPING,
			data: TWO_REGION_TREE,
			columns: createColumns<ServerRow>([
				{ accessorKey: 'region', header: 'Region' },
				{ accessorKey: 'account', header: 'Account' },
				{ accessorKey: 'amount', header: 'Amount' },
			]),
			grouping: { by: ['region'], getSubRows: (row) => row.subRows },
			aggregation: { manual: true, totals: { amount: 200 } },
			getRowId: (row) => row.id,
			layout: { footer: true },
		})

	it('labels each group', () => {
		setup()

		expect(screen.getByText('EMEA')).toBeInTheDocument()
		expect(screen.getByText('APAC')).toBeInTheDocument()
	})

	it('takes the grouped column out of the header', () => {
		setup()

		// A `columnheader`'s accessible name here is its label plus the group-by menu's own text
		// ("Account ⋮ Group by this column"), not the bare label — the fixture kit's `Menu` double
		// renders every entry inline rather than behind a closed trigger. `draft.test.tsx` queries
		// column headers the same way for the same reason.
		expect(screen.queryByRole('columnheader', { name: /Region/ })).not.toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: /Account/ })).toBeInTheDocument()
	})

	it('shows the grand total in the footer and the subtotals on the group rows', () => {
		setup()

		expect(screen.getByText('200')).toBeInTheDocument()
		expect(screen.getAllByText('100')).toHaveLength(2)
	})

	/**
	 * Driven through the table rather than by clicking, for the same reason as
	 * `grouping.test.tsx`'s equivalent case: the shared fixture kit renders `Chevron: () => null`,
	 * so there is no accessible, labelled control to click here. What the chevron does is
	 * `row.toggleExpanded()`, which is exactly what this calls; the kits' own chevrons — with
	 * their own accessible names — are covered by the browser suite.
	 */
	it('opens a group and shows its records', () => {
		const { table } = setup()

		expect(screen.queryByText('Acme')).not.toBeInTheDocument()

		act(() => {
			table.getRowModel().rows[0]?.toggleExpanded()
		})

		expect(screen.getByText('Acme')).toBeInTheDocument()
	})
})
