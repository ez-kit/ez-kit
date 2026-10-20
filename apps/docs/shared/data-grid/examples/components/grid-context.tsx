'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns, useGridContext } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { EMPLOYEE_DATA } from './_data'

import type { Employee } from './_data'
import type { CellViewCtx } from '@ez-kit/data-grid-react'

type Role = 'admin' | 'manager' | 'viewer'

declare module '@ez-kit/data-grid-react' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface GridContext {
		currentUser?: { name: string; role: Role; department: string }
	}
}

const USERS = {
	admin: { name: 'Alice Johnson', role: 'admin', department: 'Engineering' },
	manager: { name: 'Bob Smith', role: 'manager', department: 'Marketing' },
	viewer: { name: 'Carol White', role: 'viewer', department: 'Engineering' },
} as const satisfies Record<Role, { name: string; role: Role; department: string }>

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
})

const salaryFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function NameCell({ row, value }: CellViewCtx<Employee, string>) {
	const isMe = useGridContext((context) => context.currentUser?.name === row.name)
	return (
		<span>
			{value}
			{isMe && <span className='ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700'>you</span>}
		</span>
	)
}

function SalaryCell({ row, value }: CellViewCtx<Employee, number>) {
	const canSee = useGridContext((context) => {
		const user = context.currentUser
		if (!user) return false
		return user.role === 'admin' || (user.role === 'manager' && user.department === row.department)
	})
	return <span className='tabular-nums'>{canSee ? salaryFormat.format(value) : '•••••'}</span>
}

function ActionsCell() {
	const canEdit = useGridContext((context) => context.currentUser?.role === 'admin')
	return (
		<button
			type='button'
			className='rounded-md border px-2 py-1 text-xs disabled:opacity-40'
			disabled={!canEdit}
		>
			Edit
		</button>
	)
}

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name', cell: { component: NameCell } },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { component: SalaryCell } },
	{ id: 'actions', header: '', width: 90, cell: { component: ActionsCell } },
])

export function GridContextExample() {
	const [role, setRole] = useState<Role>('manager')
	const currentUser = USERS[role]

	return (
		<div className='flex flex-col gap-3'>
			<label className='flex items-center gap-2 text-sm'>
				Signed in as
				<select
					className='rounded-md border px-2 py-1'
					value={role}
					onChange={(event) => {
						setRole(event.target.value as Role)
					}}
				>
					<option value='admin'>Alice — admin</option>
					<option value='manager'>Bob — Marketing manager</option>
					<option value='viewer'>Carol — viewer</option>
				</select>
			</label>
			<DataGrid
				features={features}
				data={EMPLOYEE_DATA}
				columns={columns}
				context={{ currentUser }}
			/>
		</div>
	)
}
