import { createColumns } from '@ez-kit/data-grid-react'

export type Product = {
	id: number
	name: string
	status: string
	category: string
	image: string
	website: string
	stock: number
}

export const PRODUCT_DATA: Product[] = [
	{
		id: 1,
		name: 'Wireless Headphones',
		status: 'active',
		category: 'electronics',
		image: 'https://placehold.co/40x40',
		website: 'https://example.com/headphones',
		stock: 82,
	},
	{
		id: 2,
		name: 'Cotton T-Shirt',
		status: 'inactive',
		category: 'clothing',
		image: 'https://placehold.co/40x40',
		website: 'https://example.com/tshirt',
		stock: 45,
	},
	{
		id: 3,
		name: 'Organic Coffee',
		status: 'active',
		category: 'food',
		image: 'https://placehold.co/40x40',
		website: 'https://example.com/coffee',
		stock: 67,
	},
	{
		id: 4,
		name: 'Bluetooth Speaker',
		status: 'discontinued',
		category: 'electronics',
		image: 'https://placehold.co/40x40',
		website: 'https://example.com/speaker',
		stock: 12,
	},
	{
		id: 5,
		name: 'Running Shoes',
		status: 'active',
		category: 'clothing',
		image: 'https://placehold.co/40x40',
		website: 'https://example.com/shoes',
		stock: 95,
	},
	{
		id: 6,
		name: 'Green Tea',
		status: 'inactive',
		category: 'food',
		image: 'https://placehold.co/40x40',
		website: 'https://example.com/tea',
		stock: 30,
	},
]

export const productColumns = createColumns<Product>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'status',
		header: 'Status',
		cell: {
			type: 'badge',
			config: {
				items: [
					{ value: 'active', label: 'Active', variant: 'default' },
					{ value: 'inactive', label: 'Inactive', variant: 'secondary' },
					{ value: 'discontinued', label: 'Discontinued', variant: 'destructive' },
				],
			},
		},
	},
	{
		accessorKey: 'category',
		header: 'Category',
		cell: {
			type: 'select',
			config: {
				items: [
					{ value: 'electronics', label: 'Electronics' },
					{ value: 'clothing', label: 'Clothing' },
					{ value: 'food', label: 'Food' },
				],
			},
		},
	},
	{ accessorKey: 'image', header: 'Image', cell: { type: 'image', config: { width: 40, height: 40, alt: 'Product' } } },
	{ accessorKey: 'website', header: 'Website', cell: { type: 'link' } },
	{ accessorKey: 'stock', header: 'Stock %', cell: { type: 'progress', config: { max: 100 } } },
])

export type User = {
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

export function makeUsers(count: number): User[] {
	return Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		name: `User ${String(i + 1)}`,
		email: `user${String(i + 1)}@example.com`,
		age: 20 + (i % 50),
		active: i % 3 !== 0,
	}))
}

export const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'email',
		header: 'Email',
		creating: { description: 'Used for login and notifications' },
		editing: { description: 'Email change requires re-verification' },
	},
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

export const resizableColumns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name', size: 200, minSize: 80, maxSize: 400 },
	{ accessorKey: 'email', header: 'Email', size: 250, minSize: 120 },
	{ accessorKey: 'age', header: 'Age', size: 80, minSize: 50, maxSize: 150, cell: { type: 'number' } },
	{ accessorKey: 'active', header: 'Active', size: 100, resizing: false, cell: { type: 'boolean' } },
])

export type Employee = {
	id: number
	name: string
	department: string
	salary: number
	joinedAt: string
	active: boolean
}

export const EMPLOYEE_DATA: Employee[] = [
	{ id: 1, name: 'Alice Johnson', department: 'Engineering', salary: 95000, joinedAt: '2021-03-15', active: true },
	{ id: 2, name: 'Bob Smith', department: 'Marketing', salary: 72000, joinedAt: '2020-07-01', active: false },
	{ id: 3, name: 'Carol White', department: 'Engineering', salary: 105000, joinedAt: '2019-11-20', active: true },
	{ id: 4, name: 'Dave Brown', department: 'Sales', salary: 68000, joinedAt: '2022-01-10', active: true },
	{ id: 5, name: 'Eve Davis', department: 'Engineering', salary: 88000, joinedAt: '2021-08-05', active: true },
	{ id: 6, name: 'Frank Lee', department: 'Marketing', salary: 61000, joinedAt: '2023-04-18', active: false },
	{ id: 7, name: 'Grace Kim', department: 'Sales', salary: 77000, joinedAt: '2020-12-30', active: true },
	{ id: 8, name: 'Hank Patel', department: 'Engineering', salary: 115000, joinedAt: '2018-06-25', active: true },
]
