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
			// Row identity comes from the default `getRowId`, which keys on `row.id` —
			// stable across refetches, so selection, editing and row pinning survive one.
			// Only pass `getRowId` when the primary key is named something else.
			// ── Server-driven query ────────────────────────────────────────────
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
				// `popover` keeps a filter icon in every header and auto-mounts itself.
				// The `panel` variant renders no trigger of its own — it needs the layout
				// composed by hand (`<DataGrid.FilterPanel />`), see the Filtering docs.
				variant: 'popover',
				faceted: true,
				debounce: 300,
				chips: { position: 'above' },
				clearButton: true,
				onChange: (next) => {
					orders.setColumnFilters(next)
					orders.resetToFirstPage()
				},
			}}
			// `filtering.manual` covers global search too — TanStack routes both
			// through the same manual-filtering switch.
			globalFiltering={{
				placeholder: 'Search orders…',
				debounce: 300,
				onChange: (next) => {
					orders.setGlobalFilter(String(next ?? ''))
					orders.resetToFirstPage()
				},
			}}
			// ── Layout ─────────────────────────────────────────────────────────
			stickyHeader
			pinning={{ column: true, row: { top: true, bottom: true } }}
			sizing={{ mode: 'onEnd' }}
			columnVisibility={{ toolbar: true }}
			// ── Mutations ──────────────────────────────────────────────────────
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
			// ── Controlled state ───────────────────────────────────────────────
			// Every server-owned slice is controlled; `loading` drives the skeleton
			// on first load and the dimming refetch overlay on every load after it.
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
