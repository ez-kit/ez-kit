import { makeOrders, OrderStatus, SalesChannel, type Order } from './data'

import type { BetweenValue, ColumnFiltersState, SortingState, StructuredFilterValue } from '@ez-kit/data-grid-react'

/**
 * A fake orders API. Everything below stands in for a real backend: it owns the
 * dataset, applies filtering/sorting/paging itself, and answers over a simulated
 * network delay. The grid never sees the full table — only the page it asked for.
 */

const READ_LATENCY_MS = 550
const WRITE_LATENCY_MS = 400

/** Mutable server-side table. Mutated only inside this module, like a real DB would be. */
let TABLE: Order[] = makeOrders()

export type OrdersQuery = {
	pageIndex: number
	pageSize: number
	sorting: SortingState
	columnFilters: ColumnFiltersState
	globalFilter: string
}

export type OrdersPage = {
	rows: Order[]
	rowCount: number
}

function delay<T>(value: () => T, ms: number): Promise<T> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(value())
		}, ms)
	})
}

// ── Filtering ──────────────────────────────────────────────────────────────

/**
 * Operator predicates keyed by the operator id the grid sends. A real backend
 * would translate these into SQL; here they run in memory. The ids match
 * `@ez-kit/data-grid-core`'s built-ins — that contract is what makes
 * `filtering.manual` work.
 */
const OPERATOR_PREDICATES: Record<string, (cell: unknown, filter: unknown) => boolean> = {
	contains: (cell, filter) => text(cell).includes(text(filter)),
	equals: (cell, filter) => text(cell) === text(filter),
	startsWith: (cell, filter) => text(cell).startsWith(text(filter)),
	endsWith: (cell, filter) => text(cell).endsWith(text(filter)),
	isEmpty: (cell) => cell == null || cell === '',
	isNotEmpty: (cell) => cell != null && cell !== '',
	eq: (cell, filter) => compare(cell, filter) === 0,
	neq: (cell, filter) => compare(cell, filter) !== 0,
	gt: (cell, filter) => compare(cell, filter) > 0,
	gte: (cell, filter) => compare(cell, filter) >= 0,
	lt: (cell, filter) => compare(cell, filter) < 0,
	lte: (cell, filter) => compare(cell, filter) <= 0,
	before: (cell, filter) => compare(cell, filter) < 0,
	onOrBefore: (cell, filter) => compare(cell, filter) <= 0,
	after: (cell, filter) => compare(cell, filter) > 0,
	onOrAfter: (cell, filter) => compare(cell, filter) >= 0,
	in: (cell, filter) => !isNonEmptyArray(filter) || filter.includes(String(cell)),
	notIn: (cell, filter) => !isNonEmptyArray(filter) || !filter.includes(String(cell)),
	between: (cell, filter) => {
		const { from, to } = filter as BetweenValue
		if (from !== undefined && from !== '' && compare(cell, from) < 0) return false
		if (to !== undefined && to !== '' && compare(cell, to) > 0) return false
		return true
	},
}

function text(value: unknown): string {
	return String(value ?? '').toLowerCase()
}

function isNonEmptyArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.length > 0
}

/** Numbers compare numerically, everything else lexicographically (ISO dates sort correctly). */
function compare(cell: unknown, filter: unknown): number {
	if (typeof cell === 'number' || typeof filter === 'number') {
		return Number(cell) - Number(filter)
	}
	const a = String(cell ?? '')
	const b = String(filter ?? '')
	return a < b ? -1 : a > b ? 1 : 0
}

function isStructured(value: unknown): value is StructuredFilterValue {
	return typeof value === 'object' && value !== null && 'operator' in value
}

function matchesFilter(row: Order, columnId: string, filterValue: unknown): boolean {
	const cell = row[columnId as keyof Order]

	// Columns with `filtering.operators` send `{ operator, value }`; plain columns
	// send a bare value, which the backend treats as a substring match.
	if (!isStructured(filterValue)) return text(cell).includes(text(filterValue))

	const predicate = OPERATOR_PREDICATES[filterValue.operator]
	if (!predicate) return true

	return predicate(cell, filterValue.value)
}

function applyFilters(rows: Order[], filters: ColumnFiltersState): Order[] {
	return filters.reduce((acc, filter) => acc.filter((row) => matchesFilter(row, filter.id, filter.value)), rows)
}

function applyGlobalFilter(rows: Order[], globalFilter: string): Order[] {
	const query = globalFilter.trim().toLowerCase()
	if (!query) return rows
	return rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(query)))
}

// ── Sorting ────────────────────────────────────────────────────────────────

function applySorting(rows: Order[], sorting: SortingState): Order[] {
	if (sorting.length === 0) return rows

	return [...rows].sort((a, b) => {
		for (const { id, desc } of sorting) {
			const result = compare(a[id as keyof Order], b[id as keyof Order])
			if (result !== 0) return desc ? -result : result
		}
		return 0
	})
}

// ── Endpoints ──────────────────────────────────────────────────────────────

/** `GET /orders` — filter, sort and page server-side, return one page plus the total. */
export function queryOrders(query: OrdersQuery): Promise<OrdersPage> {
	return delay(() => {
		const filtered = applyGlobalFilter(applyFilters(TABLE, query.columnFilters), query.globalFilter)
		const sorted = applySorting(filtered, query.sorting)
		const start = query.pageIndex * query.pageSize

		return { rows: sorted.slice(start, start + query.pageSize), rowCount: filtered.length }
	}, READ_LATENCY_MS)
}

/** `POST /orders` — the server owns id and reference generation. */
export function createOrder(values: Partial<Order>): Promise<Order> {
	return delay(() => {
		const id = TABLE.reduce((max, order) => Math.max(max, order.id), 0) + 1
		const created: Order = {
			customer: '',
			status: OrderStatus.Pending,
			channel: SalesChannel.Web,
			total: 0,
			fulfilled: 0,
			placedAt: '',
			paid: false,
			...values,
			// Server-generated fields always win over whatever the client sent.
			id,
			reference: `ORD-${String(1000 + id)}`,
			invoice: `https://example.com/invoices/${String(1000 + id)}`,
		}
		TABLE = [created, ...TABLE]
		return created
	}, WRITE_LATENCY_MS)
}

/** `PATCH /orders/:id` */
export function updateOrder(id: number, values: Partial<Order>): Promise<Order> {
	return delay(() => {
		const next = TABLE.map((order) => (order.id === id ? { ...order, ...values, id } : order))
		TABLE = next

		const updated = next.find((order) => order.id === id)
		if (!updated) throw new Error(`Order ${String(id)} not found`)
		return updated
	}, WRITE_LATENCY_MS)
}

/** `DELETE /orders` — one call for both the row action and the bulk selection bar. */
export function deleteOrders(ids: number[]): Promise<void> {
	return delay(() => {
		const removed = new Set(ids)
		TABLE = TABLE.filter((order) => !removed.has(order.id))
	}, WRITE_LATENCY_MS)
}
