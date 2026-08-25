'use client'

import { DataGrid } from 'shared/DataGrid'

import { orderColumns } from './data'
import { DataGridOptions } from './DataGridOptions'
import { useOrdersState } from './use-orders-state'

// Same grid as the one-handler example, with every shared option hoisted into
// `<DataGridOptions>`. What is left is what only this grid can know: its rows,
// its columns, its state, and what a write actually does — the handlers are
// also what switch create / edit / delete on for this grid.
function OrdersGrid() {
	const orders = useOrdersState()

	return (
		<DataGrid
			data={orders.rows}
			columns={orderColumns}
			pagination={{ rowCount: orders.rowCount }}
			creating={{ onSave: ({ values }) => orders.create(values) }}
			editing={{ onSave: ({ rowId, values }) => orders.update(Number(rowId), values) }}
			deleting={{ onDelete: ({ row }) => orders.remove([row.original.id]) }}
			selection={{
				panel: {
					onDelete: ({ selectedRows, clearSelection }) => {
						void orders.remove(selectedRows.map((row) => row.original.id)).then(clearSelection)
					},
				},
			}}
			state={{ ...orders.tableState, loading: orders.loading }}
			onStateChange={orders.onStateChange}
		/>
	)
}

export function ProductionProviderExample() {
	return (
		<DataGridOptions>
			<OrdersGrid />
		</DataGridOptions>
	)
}
