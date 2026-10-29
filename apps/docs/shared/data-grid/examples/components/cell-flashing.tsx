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

const BUTTON_STYLE = {
	padding: '0.25rem 0.75rem',
	fontSize: '0.875rem',
	border: '1px solid #d1d5db',
	borderRadius: '0.375rem',
	background: 'white',
	cursor: 'pointer',
} as const

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

function usePolledQuotes(): Quote[] {
	const [quotes, setQuotes] = useState(INITIAL)

	useEffect(() => {
		const timer = setInterval(() => {
			setQuotes(tick)
		}, POLL_INTERVAL_MS)
		return () => {
			clearInterval(timer)
		}
	}, [])

	return quotes
}

export function CellFlashingExample() {
	const quotes = usePolledQuotes()

	const table = useDataGrid({
		features,
		data: quotes,
		getRowId: (quote) => quote.id,
		flashing: true,
		columns: [
			{ accessorKey: 'symbol', header: 'Symbol' },
			{
				accessorKey: 'price',
				header: 'Price',
				cell: { type: 'number', config: { decimals: 2 } },
				flashing: { status: (previous, next) => (next > previous ? 'success' : 'error') },
			},
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
				style={{ ...BUTTON_STYLE, marginBottom: '1rem' }}
			>
				Flash ACME
			</button>
			<DataGrid table={table} />
		</div>
	)
}

export function FlashCellsExample() {
	const table = useDataGrid({
		features,
		data: INITIAL,
		getRowId: (quote) => quote.id,
		columns: [
			{ accessorKey: 'symbol', header: 'Symbol' },
			{ accessorKey: 'price', header: 'Price', cell: { type: 'number', config: { decimals: 2 } } },
			{ accessorKey: 'volume', header: 'Volume', cell: { type: 'number' } },
		],
	})

	return (
		<div>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
				<button
					type='button'
					onClick={() => {
						table.flashCells({ rowIds: ['acme'] })
					}}
					style={BUTTON_STYLE}
				>
					Row: ACME
				</button>
				<button
					type='button'
					onClick={() => {
						table.flashCells({ columnIds: ['price'] })
					}}
					style={BUTTON_STYLE}
				>
					Column: Price
				</button>
				<button
					type='button'
					onClick={() => {
						table.flashCells({ rowIds: ['acme'], columnIds: ['price'], flashDuration: 100 })
					}}
					style={BUTTON_STYLE}
				>
					Cell: ACME price, 100 ms
				</button>
				<button
					type='button'
					onClick={() => {
						table.flashCells({ rowIds: ['globex'], status: 'success' })
					}}
					style={BUTTON_STYLE}
				>
					Row: GLBX, success
				</button>
				<button
					type='button'
					onClick={() => {
						table.flashCells({ rowIds: ['initech'], status: 'warning' })
					}}
					style={BUTTON_STYLE}
				>
					Row: INTC, warning
				</button>
				<button
					type='button'
					onClick={() => {
						table.flashCells({ rowIds: ['umbrella'], status: 'error' })
					}}
					style={BUTTON_STYLE}
				>
					Row: UMBR, error
				</button>
				<button
					type='button'
					onClick={() => {
						table.flashCells()
					}}
					style={BUTTON_STYLE}
				>
					All cells
				</button>
			</div>
			<DataGrid table={table} />
		</div>
	)
}

const VOLUME_SPIKE = 400

export function FlashStatusExample() {
	const quotes = usePolledQuotes()

	const table = useDataGrid({
		features,
		data: quotes,
		getRowId: (quote) => quote.id,
		flashing: true,
		columns: [
			{ accessorKey: 'symbol', header: 'Symbol' },
			{
				accessorKey: 'price',
				header: 'Price',
				cell: { type: 'number', config: { decimals: 2 } },
				flashing: { status: (previous, next) => (next > previous ? 'success' : 'error') },
			},
			{
				accessorKey: 'volume',
				header: 'Volume',
				cell: { type: 'number' },
				flashing: { status: (previous, next) => (next - previous >= VOLUME_SPIKE ? 'warning' : undefined) },
			},
			{ accessorKey: 'updatedAt', header: 'Updated' },
		],
	})

	return <DataGrid table={table} />
}

const VIRTUAL_QUOTE_COUNT = 2000

/** Each tick moves every third quote, in turn, so every row changes within three ticks. */
const MOVING_EVERY = 3

function makeVirtualQuotes(): Quote[] {
	return Array.from({ length: VIRTUAL_QUOTE_COUNT }, (_, i) => ({
		id: String(i + 1),
		symbol: `Q${String(i + 1).padStart(4, '0')}`,
		price: 50 + ((i * 37) % 400),
		volume: 1_000 + ((i * 113) % 9_000),
		updatedAt: '—',
	}))
}

function moveEveryThird(quotes: Quote[], round: number): Quote[] {
	const now = new Date().toLocaleTimeString()
	return quotes.map((quote, index) => {
		if ((index + round) % MOVING_EVERY !== 0) return quote
		const step = (Math.random() < 0.5 ? -1 : 1) * (0.01 + Math.round(Math.random() * 100) / 100)
		return { ...quote, price: Math.round((quote.price + step) * 100) / 100, updatedAt: now }
	})
}

export function VirtualizedFlashingExample() {
	const [quotes, setQuotes] = useState(makeVirtualQuotes)

	useEffect(() => {
		let round = 0
		const timer = setInterval(() => {
			round += 1
			setQuotes((current) => moveEveryThird(current, round))
		}, POLL_INTERVAL_MS)
		return () => {
			clearInterval(timer)
		}
	}, [])

	const table = useDataGrid({
		features,
		data: quotes,
		getRowId: (quote) => quote.id,
		columns: [
			{ accessorKey: 'symbol', header: 'Symbol' },
			{
				accessorKey: 'price',
				header: 'Price',
				cell: { type: 'number', config: { decimals: 2 } },
				flashing: { status: (previous, next) => (next > previous ? 'success' : 'error') },
			},
			{ accessorKey: 'volume', header: 'Volume', cell: { type: 'number' } },
			{ accessorKey: 'updatedAt', header: 'Updated' },
		],
		layout: { stickyHeader: true },
		virtualization: { row: { estimateSize: 49, overscan: 10 } },
	})

	return <DataGrid table={table} />
}
