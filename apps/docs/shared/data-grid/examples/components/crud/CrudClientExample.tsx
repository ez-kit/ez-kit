'use client'

import { DataGrid } from 'shared/DataGrid'

import { crudColumns } from './columns'
import { type Employee, useEmployeeStore } from './use-employee-store'

export function CrudClientExample() {
	const { data, add, update, remove, removeMany } = useEmployeeStore()

	return (
		<DataGrid
			data={data}
			columns={crudColumns}
			sorting
			filtering={{ variant: 'popover' }}
			pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 20, 50] }}
			visibility={{ toolbar: true }}
			pinning={{ column: true }}
			selection={{
				panel: {
					onDelete: ({ selectedRows, clearSelection }) => {
						removeMany(selectedRows.map((r) => r.original.id))
						clearSelection()
					},
				},
			}}
			creating={{
				mode: 'row',
				onSave: ({ values }) => {
					add(values)
				},
			}}
			editing={{
				mode: 'row',
				onSave: ({ rowId, values }) => {
					update(Number(rowId), values)
				},
			}}
			deleting={{
				onDelete: ({ row }) => {
					remove(row.original.id)
				},
				confirmation: {
					title: 'Delete employee?',
					description: (row) =>
						`Are you sure you want to delete "${(row.original as Employee).name}"? This action cannot be undone.`,
				},
			}}
		/>
	)
}
