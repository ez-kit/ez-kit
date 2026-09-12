'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { PRODUCT_DATA, type Product } from '../_data'

const columns = createColumns<Product>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'category', header: 'Category' },
	{ accessorKey: 'stock', header: 'Stock' },
])

const ROWS = PRODUCT_DATA.slice(0, 5)

/** The row the fake API always refuses to delete. */
const FAILING_ROW = 'Bluetooth Speaker'
const SERVER_LATENCY_MS = 400

type Call = { name: string; outcome: 'deleted' | 'rejected' | 'swallowed' }

const OUTCOME_COLOR: Record<Call['outcome'], string> = {
	deleted: 'text-emerald-600 dark:text-emerald-400',
	rejected: 'text-red-600 dark:text-red-400',
	swallowed: 'text-amber-600 dark:text-amber-400',
}

export function DeletingRollbackExample() {
	const [data, setData] = useState(ROWS)
	const [shouldRethrow, setShouldRethrow] = useState(true)
	const [calls, setCalls] = useState<Call[]>([])
	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const reset = (): void => {
		setData(ROWS)
		setCalls([])
	}

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex flex-wrap items-center gap-3 text-sm'>
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={shouldRethrow}
						onChange={(event) => {
							setShouldRethrow(event.target.checked)
							setCalls([])
						}}
					/>
					Handler rethrows the failure
				</label>
				<button
					type='button'
					className='rounded-md border px-2 py-1 text-xs'
					onClick={reset}
				>
					Reset
				</button>
			</div>

			<div className='rounded-md border p-3 text-sm'>
				<p className='mb-1 font-semibold'>
					What the grid called <span className='font-normal'>(select every row, then press Delete)</span>
				</p>
				{calls.length === 0 ? (
					<p className='text-muted-foreground'>onDelete has not run yet.</p>
				) : (
					<ol className='list-decimal pl-5'>
						{calls.map((call) => (
							<li key={call.name}>
								{call.name} — <span className={OUTCOME_COLOR[call.outcome]}>{call.outcome}</span>
							</li>
						))}
					</ol>
				)}
				<p className='mt-2 text-muted-foreground'>
					<code>state.rowSelection</code> still holds <strong>{selectedIds.length}</strong>{' '}
					{selectedIds.length === 1 ? 'id' : 'ids'} — the table has {String(data.length)}{' '}
					{data.length === 1 ? 'row' : 'rows'} left.
				</p>
			</div>

			<DataGrid
				data={data}
				columns={columns}
				selection={{
					onChange: (_rowSelection, rowIds) => {
						setSelectedIds(rowIds)
					},
				}}
				deleting={{
					// `bulk: true` — no single-call handler, so the grid loops this one over the
					// selection, in order, awaiting each call.
					bulk: true,
					onDelete: async ({ row }) => {
						const name = row.original.name
						await new Promise<void>((resolve) => {
							setTimeout(resolve, SERVER_LATENCY_MS)
						})

						if (name === FAILING_ROW) {
							if (shouldRethrow) {
								setCalls((prev) => [...prev, { name, outcome: 'rejected' }])
								throw new Error('500 Internal Server Error')
							}
							// Swallowed: the grid is told this delete succeeded.
							setCalls((prev) => [...prev, { name, outcome: 'swallowed' }])
							return
						}

						setCalls((prev) => [...prev, { name, outcome: 'deleted' }])
						setData((prev) => prev.filter((item) => item.id !== row.original.id))
					},
				}}
			/>
		</div>
	)
}
