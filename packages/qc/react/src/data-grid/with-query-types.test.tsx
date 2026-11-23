import { createDataGrid, defineCellType, defineColumnConfig } from '@ez-kit/data-grid-react'
import { allDataGridFeatures } from '@ez-kit/data-grid-react/features/all'
import { expect, expectTypeOf, it } from 'vitest'

import { createDataGridSource, withQuery } from './index'

type User = { id: string; name: string }
const source = createDataGridSource({
	key: ['users'],
	collection: {
		prepareArgs: () => undefined,
		fetcher: () => Promise.resolve([] as User[]),
		getItems: (rows) => rows,
	},
})
const cells = { badge: defineCellType<{ color: string }>()({ view: () => null }) }
const connected = withQuery(
	createDataGrid({
		components: {},
		features: allDataGridFeatures,
		cellTypes: cells,
		context: { tenant: 'one', canEdit: false },
		columnConfig: defineColumnConfig<{ editing: { mask: string } }>(),
	}),
)
const unbound = withQuery(createDataGrid({ components: {}, cellTypes: cells }))

// Compile-only consumer fixtures. Hook and JSX types must preserve the same contract.
function Consumer() {
	const table = connected.useDataGrid({
		dataSource: source,
		columns: [
			{ accessorKey: 'name', cell: { type: 'badge', config: { color: 'red' } }, editing: { config: { mask: 'AA' } } },
		],
		context: { tenant: 'two' },
		queryOptions: { enabled: true, staleTime: 30_000, refetchOnWindowFocus: (query) => query.state.data === undefined },
	})
	connected.useDataGrid({
		dataSource: source,
		columns: [],
		// @ts-expect-error Cache identity belongs to the source.
		queryOptions: { queryKey: ['replacement'] },
	})
	connected.useDataGrid({
		dataSource: source,
		columns: [],
		// @ts-expect-error Projection belongs to the source.
		queryOptions: { select: () => [] },
	})

	expectTypeOf(table.options.data[0]).toEqualTypeOf<User | undefined>()
	connected.useDataGrid({
		dataSource: source,
		columns: [],
		// @ts-expect-error The context type survives the connector.
		context: { tenant: 42 },
	})
	connected.useDataGrid({
		dataSource: source,
		columns: [
			{
				accessorKey: 'name',
				// @ts-expect-error Columns cannot register new cell types implicitly.
				cell: { type: 'missing' },
			},
		],
	})
	connected.useDataGrid({
		dataSource: source,
		columns: [
			{
				accessorKey: 'name',
				// @ts-expect-error The bundle's column-config type survives the connector.
				editing: { config: { mask: 42 } },
			},
		],
	})
	connected.useDataGrid({
		dataSource: source,
		columns: [],
		// @ts-expect-error A source owns data; the two inputs cannot be mixed.
		data: [],
	})
	// @ts-expect-error An unbound bundle still requires features.
	unbound.useDataGrid({ dataSource: source, columns: [] })
	unbound.useDataGrid({ dataSource: source, columns: [], features: allDataGridFeatures })
	connected.useDataGrid({
		dataSource: source,
		cellTypes: { rating: defineCellType<{ max: number }>()({ view: () => null }) },
		columns: [{ accessorKey: 'name', cell: { type: 'rating', config: { max: 5 } } }],
	})
	const tenant = connected.useGridContext((context) => context.tenant)
	expectTypeOf(tenant).toEqualTypeOf<string>()
	return (
		<>
			{/* @ts-expect-error A supplied table must not be connected a second time. */}
			<connected.DataGrid
				table={table}
				dataSource={source}
			/>
			{/* @ts-expect-error Configure the query on the hook owning the supplied table. */}
			<connected.DataGrid
				table={table}
				queryOptions={{ enabled: false }}
			/>
			<connected.DataGrid table={table}>
				<connected.DataGrid.Table />
			</connected.DataGrid>
			<connected.DataGrid
				dataSource={source}
				columns={[{ accessorKey: 'name', cell: { type: 'badge', config: { color: 'red' } } }]}
				queryOptions={{ enabled: true, staleTime: 30_000 }}
			/>
			{/* @ts-expect-error Wrong context values are rejected on JSX too. */}
			<connected.DataGrid
				dataSource={source}
				columns={[]}
				context={{ canEdit: 'yes' }}
			/>
		</>
	)
}
it('checks public connection types without executing compile-only fixtures', () => {
	expect(Consumer).toBeTypeOf('function')
})

function useOnlyPages() {
	// @ts-expect-error The source must configure its infinite cursor contract first.
	connected.useDataGrid({ dataSource: source, columns: [], pagination: { mode: 'infinite' } })
}

it('requires the infinite capability on the concrete source', () => {
	expect(useOnlyPages).toBeTypeOf('function')
})
