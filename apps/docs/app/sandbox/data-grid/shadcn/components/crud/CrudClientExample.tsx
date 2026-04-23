'use client'

import { DataGrid, useDataGrid } from '@ez-kit/data-grid-shadcn'

import { crudColumns } from './columns'
import { type Employee, useEmployeeStore } from './use-employee-store'

export function CrudClientExample() {
	const { data, add, update, remove, removeMany } = useEmployeeStore()

	const table = useDataGrid({
		data,
		columns: crudColumns,
		getRowId: (row) => String(row.id),
		sorting: true,
		filtering: { variant: 'popover' },
		pagination: { pageSize: 10 },
		pageSizer: { items: [5, 10, 20, 50] },
		columnVisibility: { toolbar: true },
		pinning: { column: true },
		selection: true,
		creating: {
			mode: 'row',
			onSave: (values) => add(values),
		},
		editing: {
			mode: 'row',
			onSave: (rowId, values) => update(Number(rowId), values),
		},
		deleting: {
			onDelete: (row) => { remove(row.original.id) },
			confirmation: {
				title: 'Delete employee?',
				description: (row) =>
					`Are you sure you want to delete "${(row.original as Employee).name}"? This action cannot be undone.`,
			},
		},
		selectionBar: {
			onDelete: ({ selectedRows, clearSelection }) => {
				removeMany(selectedRows.map((r) => r.original.id))
				clearSelection()
			},
		},
	})

	return <DataGrid table={table} />
}
