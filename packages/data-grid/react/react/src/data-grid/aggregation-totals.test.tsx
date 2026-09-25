import { createColumns } from '@ez-kit/data-grid-core'
import {
	columnGroupingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createManualGroupedRowModel,
	rowExpandingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
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

// ── server-grouped fixtures (Task 5's shape, redeclared here — see the react package's own
// fixture note: core's `MANUAL` carries no structural features because nothing renders there,
// while a React feature set needs the structural three or the grid throws at render) ──────────

type ServerRow = {
	id: string
	region?: string
	account?: string
	amount?: number
	subRows?: ServerRow[] | undefined
}

const EMEA_SUBROWS: ServerRow[] = [
	{ id: '1', region: 'EMEA', account: 'Acme', amount: 70 },
	{ id: '2', region: 'EMEA', account: 'Globex', amount: 30 },
]

const EMEA_GROUP: ServerRow = { id: 'g:EMEA', region: 'EMEA', amount: 100, subRows: EMEA_SUBROWS }

const TREE: ServerRow[] = [EMEA_GROUP]

/**
 * The structural three (required for any React render) plus server grouping — and deliberately
 * no `rowAggregationFeature` / `aggregationFns`. That absence is the point: it is what makes the
 * tests below prove the new `isAggregated` arm in `cell.tsx` rather than upstream's.
 */
const MANUAL_GROUPING = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnGroupingFeature,
	groupedRowModel: createManualGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})

/**
 * A grid harness whose config can be swapped after mount.
 *
 * `test-utils`'s `renderGrid` closes over its config once inside `Harness`, so its returned
 * `rerender` re-mounts the same closed-over props rather than accepting new ones — it cannot
 * drive the "a new `totals` object arrives with an unchanged `data` array" case below. This one
 * carries `config` as a prop instead, so React Testing Library's own `rerender` (re-invoked with
 * a new `config` prop) is the rerender this file needs.
 *
 * Generic over the row, defaulting to {@link Deal}, so the group-row cases below can supply
 * {@link ServerRow} data and columns without an `as any` at the call site — the same reason
 * `test-utils`'s own `renderGrid` is generic.
 */
function Harness<TRow extends object = Deal>({
	config,
}: {
	config: Partial<UseDataGridConfig<GridFeatures, TRow>>
}): ReactElement {
	const table = useDataGrid<GridFeatures, TRow>({
		features: TEST_FEATURES,
		...config,
	} as UseDataGridConfig<GridFeatures, TRow>)
	return <DataGrid<GridFeatures, TRow> table={table} />
}

function renderGrid<TRow extends object = Deal>(config: Partial<UseDataGridConfig<GridFeatures, TRow>>) {
	const result = renderWithComponents(<Harness<TRow> config={config} />)
	return {
		...result,
		rerender: (nextConfig: Partial<UseDataGridConfig<GridFeatures, TRow>>) => {
			result.rerender(<Harness<TRow> config={nextConfig} />)
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
