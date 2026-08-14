import { defineColumns } from '@ez-kit/data-grid-react'

/** Fulfilment lifecycle of an order. Closed set → enum, referenced everywhere. */
export enum OrderStatus {
	Pending = 'pending',
	Paid = 'paid',
	Shipped = 'shipped',
	Refunded = 'refunded',
	Cancelled = 'cancelled',
}

/** Where the order came from. */
export enum SalesChannel {
	Web = 'web',
	Retail = 'retail',
	Partner = 'partner',
}

export type Order = {
	id: number
	reference: string
	customer: string
	status: OrderStatus
	channel: SalesChannel
	total: number
	fulfilled: number
	placedAt: string
	paid: boolean
	invoice: string
}

export const STATUS_ITEMS = [
	{ value: OrderStatus.Pending, label: 'Pending', variant: 'secondary' as const },
	{ value: OrderStatus.Paid, label: 'Paid', variant: 'default' as const },
	{ value: OrderStatus.Shipped, label: 'Shipped', variant: 'outline' as const },
	{ value: OrderStatus.Refunded, label: 'Refunded', variant: 'secondary' as const },
	{ value: OrderStatus.Cancelled, label: 'Cancelled', variant: 'destructive' as const },
]

export const CHANNEL_ITEMS = [
	{ value: SalesChannel.Web, label: 'Web store' },
	{ value: SalesChannel.Retail, label: 'Retail' },
	{ value: SalesChannel.Partner, label: 'Partner' },
]

// ── Seed data ──────────────────────────────────────────────────────────────
// Generated deterministically (no Math.random / new Date) so the example renders
// the same rows on every reload — a moving dataset makes a docs example useless.

const SEED_ROW_COUNT = 240
const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank', 'Iris', 'Jonas']
const LAST_NAMES = ['Johnson', 'Smith', 'White', 'Brown', 'Davis', 'Lee', 'Kim', 'Patel', 'Novak', 'Rossi']
const STATUS_CYCLE = [
	OrderStatus.Paid,
	OrderStatus.Shipped,
	OrderStatus.Pending,
	OrderStatus.Paid,
	OrderStatus.Cancelled,
	OrderStatus.Shipped,
	OrderStatus.Refunded,
]
const CHANNEL_CYCLE = [SalesChannel.Web, SalesChannel.Retail, SalesChannel.Web, SalesChannel.Partner]

const EPOCH_YEAR = 2026
const DAYS_PER_MONTH = 28
const MONTHS_PER_YEAR = 12

/** `2026-04-17` from a day offset — avoids `new Date()` so the seed never drifts. */
function isoDate(dayOffset: number): string {
	const month = (Math.floor(dayOffset / DAYS_PER_MONTH) % MONTHS_PER_YEAR) + 1
	const day = (dayOffset % DAYS_PER_MONTH) + 1
	return `${String(EPOCH_YEAR)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function makeOrder(index: number): Order {
	const id = index + 1
	const first = FIRST_NAMES[index % FIRST_NAMES.length] ?? 'Alice'
	const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length] ?? 'Johnson'
	const status = STATUS_CYCLE[index % STATUS_CYCLE.length] ?? OrderStatus.Paid

	return {
		id,
		reference: `ORD-${String(1000 + id)}`,
		customer: `${first} ${last}`,
		status,
		channel: CHANNEL_CYCLE[index % CHANNEL_CYCLE.length] ?? SalesChannel.Web,
		total: 40 + ((index * 37) % 960),
		fulfilled: status === OrderStatus.Shipped ? 100 : (index * 13) % 100,
		placedAt: isoDate(index % (DAYS_PER_MONTH * MONTHS_PER_YEAR)),
		paid: status !== OrderStatus.Pending && status !== OrderStatus.Cancelled,
		invoice: `https://example.com/invoices/${String(1000 + id)}`,
	}
}

export function makeOrders(count: number = SEED_ROW_COUNT): Order[] {
	return Array.from({ length: count }, (_, index) => makeOrder(index))
}

// ── Columns ────────────────────────────────────────────────────────────────

// Sizes are deliberately generous: every header carries its title plus sort, filter
// and menu buttons, and together the columns overflow the viewport — which is the
// point. Without horizontal scrolling there is nothing for column pinning to hold.
export const orderColumns = defineColumns<Order>([
	{
		accessorKey: 'reference',
		header: 'Order',
		size: 170,
		minSize: 140,
		// Starts pinned left; the column menu still lets the user unpin it.
		pinning: { defaultPin: 'left' },
		filtering: { operators: true },
		editing: false,
	},
	{
		accessorKey: 'customer',
		header: 'Customer',
		size: 220,
		minSize: 160,
		filtering: { operators: true },
		creating: { description: 'Full name as it appears on the invoice' },
	},
	{
		accessorKey: 'status',
		header: 'Status',
		size: 170,
		minSize: 140,
		cell: { type: 'badge', config: { items: STATUS_ITEMS } },
		// Multi-value: badge/select columns default to the `in` operator.
		filtering: { operators: true },
	},
	{
		accessorKey: 'channel',
		header: 'Channel',
		size: 170,
		minSize: 140,
		cell: { type: 'select', config: { items: CHANNEL_ITEMS } },
		filtering: { operators: true },
	},
	{
		accessorKey: 'total',
		header: 'Total, $',
		size: 150,
		minSize: 120,
		cell: { type: 'number' },
		filtering: { operators: { betweenOperator: { variant: 'inputs' } } },
	},
	{
		accessorKey: 'fulfilled',
		header: 'Fulfilled',
		size: 170,
		minSize: 140,
		cell: { type: 'progress', config: { max: 100 } },
		editing: false,
	},
	{
		accessorKey: 'placedAt',
		header: 'Placed',
		size: 180,
		minSize: 150,
		cell: { type: 'date', config: { format: { dateStyle: 'medium' } } },
		filtering: { operators: { items: ['eq', 'before', 'after', 'between'] } },
	},
	{
		accessorKey: 'paid',
		header: 'Paid',
		size: 130,
		minSize: 110,
		cell: { type: 'boolean' },
	},
	{
		accessorKey: 'invoice',
		header: 'Invoice',
		size: 200,
		minSize: 150,
		cell: { type: 'link' },
		// Off by default — the column picker in the toolbar brings it back.
		visibility: { defaultHidden: true },
		sorting: false,
		editing: false,
	},
])
