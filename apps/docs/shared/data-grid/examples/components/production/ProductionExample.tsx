'use client'

import { DataGrid } from 'shared/DataGrid'

import { orderColumns, type Order } from './data'
import { useOrders } from './use-orders'

export function ProductionExample() {
	const orders = useOrders()

	return (
		<DataGrid
			data={orders.rows}
			columns={orderColumns}
			pagination={{
				manual: true,
				rowCount: orders.rowCount,
				pageSizeOptions: [10, 25, 50],
				variant: 'numbered',
				siblings: 1,
				onChange: ({ pageIndex, pageSize }) => {
					orders.setPageIndex(pageIndex)
					orders.setPageSize(pageSize)
				},
			}}
			sorting={{
				manual: true,
				multi: { max: 3, event: 'ctrl' },
				toolbar: true,
				onChange: (next) => {
					orders.setSorting(next)
					orders.resetToFirstPage()
				},
			}}
			filtering={{
				manual: true,
				variant: 'popover',
				faceted: true,
				debounce: 300,
				chips: { position: 'above' },
				toolbar: true,
				onChange: (next) => {
					orders.setColumnFilters(next)
					orders.resetToFirstPage()
				},
			}}
			globalFiltering={{
				placeholder: 'Search orders…',
				debounce: 300,
				onChange: (next) => {
					orders.setGlobalFilter(String(next ?? ''))
					orders.resetToFirstPage()
				},
			}}
			layout={{ stickyHeader: true }}
			pinning={{ column: true, row: { top: true, bottom: true } }}
			resizing={{ mode: 'onChange' }}
			visibility={{ toolbar: true }}
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
			state={{
				pagination: { pageIndex: orders.pageIndex, pageSize: orders.pageSize },
				sorting: orders.sorting,
				columnFilters: orders.columnFilters,
				globalFilter: orders.globalFilter,
				loading: orders.loading,
			}}
		/>
	)
}
