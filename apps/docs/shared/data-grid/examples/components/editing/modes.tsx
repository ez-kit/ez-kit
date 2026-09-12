'use client'

import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, INITIAL_DATA, type User } from '../_data'

function useEditableUsers() {
	const [data, setData] = useState<User[]>(INITIAL_DATA)

	const save = ({ rowId, values }: { rowId: string; values: Partial<User> }) => {
		setData((prev) => prev.map((row) => (String(row.id) === rowId ? { ...row, ...values } : row)))
	}

	return { data, save }
}

export function EditingRowModeExample() {
	const { data, save } = useEditableUsers()

	return (
		<DataGrid<User>
			data={data}
			columns={columns}
			editing={{ mode: 'row', onSave: save }}
		/>
	)
}

export function EditingModalModeExample() {
	const { data, save } = useEditableUsers()

	return (
		<DataGrid<User>
			data={data}
			columns={columns}
			editing={{ mode: 'modal', onSave: save }}
		/>
	)
}

export function EditingCellModeExample() {
	const { data, save } = useEditableUsers()

	return (
		<DataGrid<User>
			data={data}
			columns={columns}
			editing={{ mode: 'cell', onSave: save }}
		/>
	)
}
