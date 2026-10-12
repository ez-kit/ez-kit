import { createColumns } from '@ez-kit/data-grid-core'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MANUAL_GROUPING, renderGrid, TREE } from './manual-grouping-fixtures'

import type { ServerRow } from './manual-grouping-fixtures'

type Deal = { id: string; account: string; amount: number }

// Sums to 100, so a client-computed total is visibly different from a supplied one.
const PAGE: Deal[] = [
	{ id: '1', account: 'Acme', amount: 70 },
	{ id: '2', account: 'Globex', amount: 30 },
]

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

	it('treats a present key with an `undefined` value as a real (empty) total, not an absent one', () => {
		// `Object.hasOwn(supplied, column.id)` is true here, so the total is `undefined` and the
		// footer renders nothing — it must NOT fall through to the client-computed sum (100), which
		// is what an absent key (with `manual` off) would do. A `!== undefined` presence check
		// cannot tell these two cases apart; `Object.hasOwn` is what pins the difference.
		renderGrid({
			data: PAGE,
			columns: createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount', aggregation: 'sum' }]),
			aggregation: { totals: { amount: undefined } },
			layout: { footer: true },
		})

		expect(screen.queryByText('100')).not.toBeInTheDocument()
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

describe("a group row's server-supplied subtotal", () => {
	it("renders a group row's supplied subtotal through `aggregation.component`", () => {
		renderGrid<ServerRow>({
			features: MANUAL_GROUPING, // no rowAggregationFeature, no aggregationFns
			data: TREE,
			columns: createColumns<ServerRow>([
				{ accessorKey: 'region' },
				{
					accessorKey: 'amount',
					// `aggregation.component` is `TNode` on the core column def — not a renderer signature —
					// so an inline arrow gets no contextual type for its parameter; annotate it explicitly.
					aggregation: { component: ({ value }: { value: unknown }) => <b>{`sum ${String(value)}`}</b> },
				},
			]),
			grouping: { by: ['region'], getSubRows: (row) => row.subRows },
			getRowId: (row) => row.id,
		})

		expect(screen.getByText('sum 100')).toBeInTheDocument()
	})

	it('stamps a group row aggregate cell so a kit can style it', () => {
		const { container } = renderGrid<ServerRow>({
			features: MANUAL_GROUPING,
			data: TREE,
			columns: createColumns<ServerRow>([{ accessorKey: 'region' }, { accessorKey: 'amount' }]),
			grouping: { by: ['region'], getSubRows: (row) => row.subRows },
			getRowId: (row) => row.id,
		})

		expect(container.querySelectorAll('[data-aggregated-cell="true"]').length).toBeGreaterThan(0)
	})
})
