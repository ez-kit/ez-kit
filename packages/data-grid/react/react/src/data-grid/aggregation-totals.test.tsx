import { createColumns } from '@ez-kit/data-grid-core'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithComponents, TEST_FEATURES } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { ReactElement } from 'react'

type Deal = { id: string; account: string; amount: number }

// Sums to 100, so a client-computed total is visibly different from a supplied one.
const PAGE: Deal[] = [
	{ id: '1', account: 'Acme', amount: 70 },
	{ id: '2', account: 'Globex', amount: 30 },
]

/**
 * A grid harness whose config can be swapped after mount.
 *
 * `test-utils`'s `renderGrid` closes over its config once inside `Harness`, so its returned
 * `rerender` re-mounts the same closed-over props rather than accepting new ones — it cannot
 * drive the "a new `totals` object arrives with an unchanged `data` array" case below. This one
 * carries `config` as a prop instead, so React Testing Library's own `rerender` (re-invoked with
 * a new `config` prop) is the rerender this file needs.
 */
function Harness({ config }: { config: Partial<UseDataGridConfig<GridFeatures, Deal>> }): ReactElement {
	const table = useDataGrid<GridFeatures, Deal>({
		features: TEST_FEATURES,
		...config,
	} as UseDataGridConfig<GridFeatures, Deal>)
	return <DataGrid<GridFeatures, Deal> table={table} />
}

function renderGrid(config: Partial<UseDataGridConfig<GridFeatures, Deal>>) {
	const result = renderWithComponents(<Harness config={config} />)
	return {
		...result,
		rerender: (nextConfig: Partial<UseDataGridConfig<GridFeatures, Deal>>) => {
			result.rerender(<Harness config={nextConfig} />)
		},
	}
}

describe('server-supplied grand totals', () => {
	it('renders `aggregation.totals` in the footer of a column that never wrote `aggregation`', () => {
		renderGrid({
			data: PAGE,
			columns: createColumns<Deal>([
				{ accessorKey: 'account', header: 'Account', footer: 'Total' },
				{ accessorKey: 'amount', header: 'Amount' },
			]),
			aggregation: { manual: true, totals: { amount: 232_000 } },
			layout: { footer: true },
		})

		expect(screen.getByText('232000')).toBeInTheDocument()
	})

	it('renders a falsy total rather than treating it as absent', () => {
		renderGrid({
			data: [],
			columns: createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount' }]),
			aggregation: { manual: true, totals: { amount: 0 } },
			layout: { footer: true },
		})

		expect(screen.getByText('0')).toBeInTheDocument()
	})

	it("lets the column's own `footer` win over a supplied total", () => {
		renderGrid({
			data: PAGE,
			columns: createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount', footer: 'n/a' }]),
			aggregation: { manual: true, totals: { amount: 232_000 } },
			layout: { footer: true },
		})

		expect(screen.getByText('n/a')).toBeInTheDocument()
		expect(screen.queryByText('232000')).not.toBeInTheDocument()
	})

	it('renders nothing for a totalled column with no entry under `manual`', () => {
		renderGrid({
			data: PAGE,
			columns: createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount', aggregation: 'sum' }]),
			aggregation: { manual: true },
			layout: { footer: true },
		})

		expect(screen.queryByText('100')).not.toBeInTheDocument()
	})

	it('computes on the client when `manual` is absent', () => {
		renderGrid({
			data: PAGE,
			columns: createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount', aggregation: 'sum' }]),
			layout: { footer: true },
		})

		expect(screen.getByText('100')).toBeInTheDocument()
	})

	it('repaints the footer when a new `totals` arrives with an unchanged `data` array', () => {
		const columns = createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount' }])
		const { rerender } = renderGrid({
			data: PAGE,
			columns,
			aggregation: { manual: true, totals: { amount: 1 } },
			layout: { footer: true },
		})

		expect(screen.getByText('1')).toBeInTheDocument()

		// Same array identity — only the totals object changed.
		rerender({ data: PAGE, columns, aggregation: { manual: true, totals: { amount: 2 } }, layout: { footer: true } })

		expect(screen.getByText('2')).toBeInTheDocument()
	})
})
