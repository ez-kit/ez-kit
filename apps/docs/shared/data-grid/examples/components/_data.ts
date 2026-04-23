import { defineColumns } from '@ez-kit/data-grid-react'

export interface Product {
	id: number
	name: string
	status: string
	category: string
	image: string
	website: string
	stock: number
}

export const PRODUCT_DATA: Product[] = [
	{ id: 1, name: 'Wireless Headphones', status: 'active', category: 'electronics', image: 'https://placehold.co/40x40', website: 'https://example.com/headphones', stock: 82 },
	{ id: 2, name: 'Cotton T-Shirt', status: 'inactive', category: 'clothing', image: 'https://placehold.co/40x40', website: 'https://example.com/tshirt', stock: 45 },
	{ id: 3, name: 'Organic Coffee', status: 'active', category: 'food', image: 'https://placehold.co/40x40', website: 'https://example.com/coffee', stock: 67 },
	{ id: 4, name: 'Bluetooth Speaker', status: 'discontinued', category: 'electronics', image: 'https://placehold.co/40x40', website: 'https://example.com/speaker', stock: 12 },
	{ id: 5, name: 'Running Shoes', status: 'active', category: 'clothing', image: 'https://placehold.co/40x40', website: 'https://example.com/shoes', stock: 95 },
	{ id: 6, name: 'Green Tea', status: 'inactive', category: 'food', image: 'https://placehold.co/40x40', website: 'https://example.com/tea', stock: 30 },
]

export const productColumns = defineColumns<Product>([
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
