'use client'

import { DataGrid } from 'shared/DataGrid'

import { orderColumns, type Order } from './data'
import { useOrdersState } from './use-orders-state'

/**
 * The same orders console, with the query composed before it is sent.
 *
 * Two sort levels plus a filter and a search term leave the grid as **one**
 * request, when the user presses Apply. Nothing is fed back down through
 * `state` on the three deferred axes — the draft is grid-owned.
 */
export function ProductionDeferredApplyExample() {
	const orders = useOrdersState()

	return (
		<DataGrid
			data={orders.rows}
			columns={orderColumns}
			deferredApply
			pagination={{
				manual: true,
				rowCount: orders.rowCount,
				pageSizeOptions: [10, 25, 50],
				variant: 'numbered',
				siblings: 1,
			}}
			sorting={{ manual: true, multi: { max: 3, event: 'ctrl' }, toolbar: true }}
			filtering={{
				manual: true,
				variant: 'popover',
				faceted: true,
				chips: { position: 'above' },
				toolbar: true,
			}}
			globalFiltering={{ placeholder: 'Search orders…' }}
			layout={{ stickyHeader: true }}
			columnVisibility={{ toolbar: true }}
			deleting={{
				onDelete: ({ row }) => orders.remove([row.original.id]),
				confirmation: {
					title: 'Delete order?',
					description: (row) => `Order ${(row.original as Order).reference} will be permanently removed.`,
				},
			}}
			selection={{
				panel: {
					onDelete: ({ selectedRows, clearSelection }) => {
						void orders.remove(selectedRows.map((row) => row.original.id)).then(clearSelection)
					},
				},
			}}
			state={{ loading: orders.loading }}
			onStateChange={orders.onStateChange}
		/>
	)
}
