'use client'

import {
	cellFlashingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useEffect, useState } from 'react'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	cellFlashingFeature,
})

type Quote = {
	id: string
	symbol: string
	price: number
	volume: number
	updatedAt: string
}

const INITIAL: Quote[] = [
	{ id: 'acme', symbol: 'ACME', price: 128.4, volume: 12_400, updatedAt: '—' },
	{ id: 'globex', symbol: 'GLBX', price: 54.1, volume: 8_150, updatedAt: '—' },
	{ id: 'initech', symbol: 'INTC', price: 212.9, volume: 3_920, updatedAt: '—' },
	{ id: 'umbrella', symbol: 'UMBR', price: 9.75, volume: 41_300, updatedAt: '—' },
	{ id: 'hooli', symbol: 'HOOL', price: 377.2, volume: 1_870, updatedAt: '—' },
]

const POLL_INTERVAL_MS = 1500

function tick(quotes: Quote[]): Quote[] {
	const moved = Math.floor(Math.random() * quotes.length)
	const now = new Date().toLocaleTimeString()
	return quotes.map((quote, index) =>
		index === moved
			? {
					...quote,
					price: Math.round(quote.price * (1 + (Math.random() - 0.5) / 50) * 100) / 100,
					volume: quote.volume + Math.floor(Math.random() * 500),
					updatedAt: now,
				}
			: { ...quote, updatedAt: now },
	)
}

export function CellFlashingExample() {
	const [quotes, setQuotes] = useState(INITIAL)

	useEffect(() => {
		const timer = setInterval(() => {
			setQuotes(tick)
		}, POLL_INTERVAL_MS)
		return () => {
			clearInterval(timer)
		}
	}, [])

	const table = useDataGrid({
		features,
		data: quotes,
		getRowId: (quote) => quote.id,
		flashing: true,
		columns: [
			{ accessorKey: 'symbol', header: 'Symbol' },
			{ accessorKey: 'price', header: 'Price', cell: { type: 'number', config: { decimals: 2 } } },
			{ accessorKey: 'volume', header: 'Volume', cell: { type: 'number' } },
			{ accessorKey: 'updatedAt', header: 'Updated', flashing: false },
		],
	})

	return (
		<div>
			<button
				type='button'
				onClick={() => {
					table.flashCells({ rowIds: ['acme'] })
				}}
				style={{
					marginBottom: '1rem',
					padding: '0.25rem 0.75rem',
					fontSize: '0.875rem',
					border: '1px solid #d1d5db',
					borderRadius: '0.375rem',
					background: 'white',
					cursor: 'pointer',
				}}
			>
				Flash ACME
			</button>
			<DataGrid table={table} />
		</div>
	)
}
