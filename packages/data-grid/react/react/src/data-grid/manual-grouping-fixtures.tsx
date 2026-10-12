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
import { useEffect } from 'react'

import { renderWithComponents, TEST_FEATURES } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { DataTable, GridFeatures } from '../types'
import type { UseDataGridConfig } from '../use-data-grid'
import type { RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'

/**
 * Shared between `aggregation-totals.test.tsx` (a group row's server-supplied subtotal) and
 * `manual-grouping.test.tsx` (the same feature proved end to end, with no source change): the
 * `ServerRow` shape, the `MANUAL_GROUPING` feature set, the tree fixtures, and the config-prop
 * harness both suites render through. Extracted here rather than duplicated verbatim across the
 * two files in this directory.
 */

/**
 * A server-grouped row: the group's own fields (here `amount`) are the subtotal the server
 * computed, carried on the group row itself rather than produced by a client aggregation
 * function.
 */
export type ServerRow = {
	id: string
	region?: string
	account?: string
	amount?: number
	subRows?: ServerRow[] | undefined
}

/**
 * The structural three (required for any React render) plus server grouping — and deliberately
 * no `rowAggregationFeature` / `aggregationFns`. That absence is the point: both suites that use
 * this set prove subtotals render, with no aggregation feature registered at all.
 */
export const MANUAL_GROUPING = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnGroupingFeature,
	groupedRowModel: createManualGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})

// ── fixtures ───────────────────────────────────────────────────────────────

const EMEA_SUBROWS: ServerRow[] = [
	{ id: '1', region: 'EMEA', account: 'Acme', amount: 70 },
	{ id: '2', region: 'EMEA', account: 'Globex', amount: 30 },
]

const EMEA_GROUP: ServerRow = { id: 'g:EMEA', region: 'EMEA', amount: 100, subRows: EMEA_SUBROWS }

/**
 * One group (EMEA), subtotal 100. `aggregation-totals.test.tsx`'s single-group cases assert
 * `screen.getByText('sum 100')` and a single aggregated cell — **do not add a second group to
 * this tree.** A second 100-subtotal group would make that `getByText` match two elements and
 * throw, silently breaking already-reviewed work. A case that needs more than one group (group
 * labelling, header removal, per-group subtotals, opening one group without disturbing another)
 * should use {@link TWO_REGION_TREE} instead.
 */
export const TREE: ServerRow[] = [EMEA_GROUP]

const APAC_SUBROWS: ServerRow[] = [
	{ id: '3', region: 'APAC', account: 'Initech', amount: 60 },
	{ id: '4', region: 'APAC', account: 'Soylent', amount: 40 },
]

const APAC_GROUP: ServerRow = { id: 'g:APAC', region: 'APAC', amount: 100, subRows: APAC_SUBROWS }

/**
 * Two groups (EMEA, APAC), subtotal 100 each, grand total 200 — for cases that need more than one
 * group. See the note on {@link TREE} for why that fixture stays single-group rather than growing
 * a second one.
 */
export const TWO_REGION_TREE: ServerRow[] = [EMEA_GROUP, APAC_GROUP]

// ── harness ────────────────────────────────────────────────────────────────

/**
 * A grid harness whose config can be swapped after mount.
 *
 * `test-utils`'s `renderGrid` closes over its config once inside `Harness`, so its returned
 * `rerender` re-mounts the same closed-over props rather than accepting new ones — it cannot
 * drive an "a new prop arrives with an unchanged data array" case. This one carries `config` as a
 * prop instead, so React Testing Library's own `rerender` (re-invoked with a new `config` prop)
 * is the rerender a caller needs.
 *
 * Generic over the row so a group-row case can supply {@link ServerRow} data and columns without
 * an `as any` at the call site — the same reason `test-utils`'s own `renderGrid` is generic.
 *
 * Hands the live `table` out through `onTable` in an effect, not during render — writing to an
 * outer ref mid-render is a side effect — mirroring `test-utils`'s `renderGrid`, so a caller (the
 * "opens a group" case) can drive `table.getRowModel().rows[0]?.toggleExpanded()` directly.
 */
function Harness<TRow extends object = object>({
	config,
	onTable,
}: {
	config: Partial<UseDataGridConfig<GridFeatures, TRow>>
	onTable: (table: DataTable<GridFeatures, TRow>) => void
}): ReactElement {
	const table = useDataGrid<GridFeatures, TRow>({
		features: TEST_FEATURES,
		...config,
	} as UseDataGridConfig<GridFeatures, TRow>)
	useEffect(() => {
		onTable(table)
	}, [table, onTable])
	return <DataGrid<GridFeatures, TRow> table={table} />
}

/**
 * `renderGrid`'s return value: the RTL render result plus the live `table`, and a `rerender` that
 * takes a fresh `config` rather than replaying the closed-over one — see the harness docblock.
 */
export type RenderGridResult<TRow extends object = object> = Omit<RenderResult, 'rerender'> & {
	table: DataTable<GridFeatures, TRow>
	rerender: (nextConfig: Partial<UseDataGridConfig<GridFeatures, TRow>>) => void
}

export function renderGrid<TRow extends object = object>(
	config: Partial<UseDataGridConfig<GridFeatures, TRow>>,
): RenderGridResult<TRow> {
	// Wrapper object, not a bare `let`: reassigning an outer variable during render is a side
	// effect the react-hooks lint rule rejects.
	const ref: { table: DataTable<GridFeatures, TRow> | null } = { table: null }
	const onTable = (table: DataTable<GridFeatures, TRow>): void => {
		ref.table = table
	}

	// Destructured out rather than spread over: this `rerender` deliberately replaces RTL's own
	// `(ui: ReactNode) => void` with one that takes a fresh `config`, and a plain spread merges the
	// two signatures into an intersection no caller can satisfy instead of overriding.
	const { rerender: rtlRerender, ...rest } = renderWithComponents(
		<Harness<TRow>
			config={config}
			onTable={onTable}
		/>,
	)
	if (!ref.table) throw new Error('renderGrid: the grid never mounted, so no table was captured.')
	const table = ref.table

	return {
		...rest,
		table,
		rerender: (nextConfig: Partial<UseDataGridConfig<GridFeatures, TRow>>) => {
			rtlRerender(
				<Harness<TRow>
					config={nextConfig}
					onTable={onTable}
				/>,
			)
		},
	}
}
