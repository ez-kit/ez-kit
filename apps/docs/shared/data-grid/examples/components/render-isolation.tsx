'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns, useGridContext } from '@ez-kit/data-grid-react'
import { createStore, useSelector } from '@tanstack/react-store'
import { useRef, useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import type { CellViewCtx } from '@ez-kit/data-grid-react'
import type { Store } from '@tanstack/react-store'
import type { ReactNode } from 'react'

declare module '@ez-kit/data-grid-react' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface GridContext {
		canEditOrders?: boolean
		highlightedOrder?: Store<{ id: number | null }>
	}
}

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
})

type Order = { id: number; customer: string; total: number }

const ORDERS: Order[] = [
	{ id: 1001, customer: 'Ada Lovelace', total: 120 },
	{ id: 1002, customer: 'Grace Hopper', total: 86 },
	{ id: 1003, customer: 'Alan Turing', total: 240 },
	{ id: 1004, customer: 'Katherine Johnson', total: 54 },
	{ id: 1005, customer: 'Edsger Dijkstra', total: 310 },
]

const NO_HIGHLIGHT = createStore<{ id: number | null }>({ id: null })

function useRenderCount(): number {
	const renders = useRef(0)
	renders.current += 1
	return renders.current
}

function RenderCount() {
	const renders = useRenderCount()
	return <span className='text-muted-foreground ml-2 text-xs tabular-nums'>×{renders}</span>
}

function HighlightCell({ row, value }: CellViewCtx<Order, number>) {
	const highlightedOrder = useGridContext((context) => context.highlightedOrder)
	const isHighlighted = useSelector(highlightedOrder ?? NO_HIGHLIGHT, (state) => state.id === row.id)
	return (
		<span className={isHighlighted ? 'font-semibold text-amber-600' : undefined}>
			{isHighlighted ? '● ' : ''}#{value}
			<RenderCount />
		</span>
	)
}

function AccessCell() {
	const canEdit = useGridContext((context) => context.canEditOrders ?? false)
	return (
		<span>
			{canEdit ? 'Editable' : 'Read-only'}
			<RenderCount />
		</span>
	)
}

function CustomerCell({ value }: CellViewCtx<Order, string>) {
	return (
		<span>
			{value}
			<RenderCount />
		</span>
	)
}

const columns = createColumns<Order>([
	{ accessorKey: 'id', header: 'Order', cell: { component: HighlightCell } },
	{ accessorKey: 'customer', header: 'Customer', cell: { component: CustomerCell } },
	{ id: 'access', header: 'Access', cell: { component: AccessCell } },
])

function OrdersHost({ children }: { children: ReactNode }) {
	const [canEdit, setCanEdit] = useState(false)
	const [highlightedOrder] = useState(() => createStore<{ id: number | null }>({ id: null }))

	const highlightNext = () => {
		highlightedOrder.setState(({ id }) => {
			const index = ORDERS.findIndex((order) => order.id === id)
			return { id: ORDERS[(index + 1) % ORDERS.length]?.id ?? null }
		})
	}

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex gap-2'>
				<button
					type='button'
					className='rounded-md border px-3 py-1.5 text-sm'
					onClick={() => {
						setCanEdit((value) => !value)
					}}
				>
					{canEdit ? 'Revoke editing' : 'Allow editing'}
				</button>
				<button
					type='button'
					className='rounded-md border px-3 py-1.5 text-sm'
					onClick={highlightNext}
				>
					Highlight next order
				</button>
			</div>
			<DataGrid
				features={features}
				data={ORDERS}
				columns={columns}
				context={{ canEditOrders: canEdit, highlightedOrder }}
			>
				{children}
			</DataGrid>
		</div>
	)
}

export function RenderIsolationExample() {
	return (
		<OrdersHost>
			<DataGrid.Table />
		</OrdersHost>
	)
}
