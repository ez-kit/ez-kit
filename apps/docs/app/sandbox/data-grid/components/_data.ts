import { defineColumns } from '@ez-kit/data-grid-react'

export interface User {
	id: number
	name: string
	email: string
	age: number
	active: boolean
}

export const INITIAL_DATA: User[] = [
	{ id: 1, name: 'Alice Johnson', email: 'alice@example.com', age: 30, active: true },
	{ id: 2, name: 'Bob Smith', email: 'bob@example.com', age: 25, active: false },
	{ id: 3, name: 'Carol White', email: 'carol@example.com', age: 35, active: true },
	{ id: 4, name: 'Dave Brown', email: 'dave@example.com', age: 28, active: true },
	{ id: 5, name: 'Eve Davis', email: 'eve@example.com', age: 32, active: false },
]

export const columns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

export const resizableColumns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name', size: 200, minSize: 80, maxSize: 400 },
	{ accessorKey: 'email', header: 'Email', size: 250, minSize: 120 },
	{ accessorKey: 'age', header: 'Age', size: 80, minSize: 50, maxSize: 150, cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', size: 100, enableResizing: false, cell: { type: 'boolean' } },
])
