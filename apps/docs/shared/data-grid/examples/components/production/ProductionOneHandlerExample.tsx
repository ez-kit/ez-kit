'use client'

import { DataGrid } from 'shared/DataGrid'

import { orderColumns } from './data'
import { consoleFeatures } from './features'
import { ProductionLayout } from './ProductionLayout'
import { useOrdersState } from './use-orders-state'

export function ProductionOneHandlerExample() {
	const orders = useOrdersState()

	return (
		<DataGrid
			features={consoleFeatures}
			data={orders.rows}
			columns={orderColumns}
			pagination={{
				manual: true,
				rowCount: orders.rowCount,
				items: [10, 25, 50],
				siblings: 1,
			}}
			sorting={{ manual: true, multi: { max: 3, event: 'ctrl' } }}
			filtering={{
				manual: true,
				faceted: true,
				debounce: 300,
			}}
			globalFiltering={{ placeholder: 'Search orders…', debounce: 300 }}
			layout={{ stickyHeader: true }}
			pinning={{ column: true, row: { top: true, bottom: true } }}
			resizing={{ mode: 'onChange' }}
			visibility
			creating={{
				mode: 'modal',
				onSave: ({ values }) => orders.create(values),
			}}
			editing={{
				mode: 'modal',
				onSave: ({ rowId, values }) => orders.update(Number(rowId), values),
			}}
			deleting={{
				onDelete: ({ row }) => orders.remove([row.original.id]),
				confirmation: {
					title: 'Delete order?',
					description: (row) => `Order ${row.original.reference} will be permanently removed.`,
				},
				bulk: {
					onDelete: ({ rows }) => orders.remove(rows.map((row) => row.original.id)),
					confirmation: { title: 'Delete orders?' },
				},
			}}
			selection
			state={{ ...orders.tableState, loading: orders.loading }}
			onStateChange={orders.onStateChange}
		>
			<ProductionLayout />
		</DataGrid>
	)
}
