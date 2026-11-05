'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useEffect, useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import type { CellViewCtx } from '@ez-kit/data-grid-react'

type Quote = {
	id: string
	symbol: string
	company: string
	price: number
	change: number
	volume: number
	trend: number[]
}

const INITIAL: Quote[] = [
	{
		id: 'nvda',
		symbol: 'NVDA',
		company: 'NVIDIA',
		price: 128.4,
		change: 2.38,
		volume: 12400,
		trend: [12, 18, 15, 23, 20, 28, 26, 35],
	},
	{
		id: 'aapl',
		symbol: 'AAPL',
		company: 'Apple',
		price: 212.9,
		change: 1.42,
		volume: 8150,
		trend: [12, 14, 12, 20, 18, 25, 22, 29],
	},
	{
		id: 'msft',
		symbol: 'MSFT',
		company: 'Microsoft',
		price: 417.2,
		change: -0.84,
		volume: 3920,
		trend: [31, 28, 30, 24, 25, 21, 23, 18],
	},
	{
		id: 'amzn',
		symbol: 'AMZN',
		company: 'Amazon',
		price: 186.75,
		change: 1.17,
		volume: 6500,
		trend: [10, 14, 13, 19, 16, 22, 24, 28],
	},
	{
		id: 'tsla',
		symbol: 'TSLA',
		company: 'Tesla',
		price: 243.12,
		change: -1.25,
		volume: 10900,
		trend: [29, 24, 28, 19, 23, 16, 19, 13],
	},
]

// Seed each sparkline with plausible prices that end at the displayed quote. Subsequent
// points are the actual simulated prices, so the line and the price always move together.
const INITIAL_QUOTES = INITIAL.map((quote) => ({
	...quote,
	trend: quote.trend.map(
		(point) => Math.round((quote.price + (point - (quote.trend.at(-1) ?? point)) * 0.2) * 100) / 100,
	),
}))
const REFERENCE_PRICES = new Map(INITIAL.map((quote) => [quote.id, quote.price / (1 + quote.change / 100)]))

function SymbolCell({ row }: CellViewCtx<Quote, string>) {
	return (
		<span className='flex flex-col'>
			<strong>{row.symbol}</strong>
			<span className='text-xs opacity-55'>{row.company}</span>
		</span>
	)
}
function ChangeCell({ value }: CellViewCtx<Quote, number>) {
	return (
		<span className={value >= 0 ? 'font-medium text-emerald-600' : 'font-medium text-rose-600'}>
			{value >= 0 ? '+' : ''}
			{value.toFixed(2)}%
		</span>
	)
}
function TrendCell({ value }: CellViewCtx<Quote, number[]>) {
	const min = Math.min(...value)
	const range = Math.max(Math.max(...value) - min, 0.01)
	const points = value
		.map((point, index) => `${String(index * 10)},${String(36 - ((point - min) / range) * 32)}`)
		.join(' ')
	return (
		<svg
			viewBox='0 0 70 40'
			width='70'
			height='32'
			role='img'
			aria-label='Recent simulated price trend'
		>
			<polyline
				points={points}
				fill='none'
				stroke='currentColor'
				strokeWidth='2'
				className='text-violet-500'
			/>
		</svg>
	)
}

const columns = createColumns<Quote>([
	{ accessorKey: 'symbol', header: 'Asset', width: 150, cell: { component: SymbolCell } },
	{
		accessorKey: 'price',
		header: 'Price',
		cell: { type: 'number', config: { decimals: 2 } },
		flashing: { status: (previous, next) => (next > previous ? 'success' : 'error') },
	},
	{ accessorKey: 'change', header: 'Change', cell: { component: ChangeCell } },
	{ accessorKey: 'volume', header: 'Volume', cell: { type: 'number' } },
	{
		accessorKey: 'trend',
		header: 'Trend',
		cell: { component: TrendCell },
		flashing: false,
		filtering: false,
		sorting: false,
	},
])

export function LandingQuotesExample() {
	const [quotes, setQuotes] = useState(INITIAL_QUOTES)

	useEffect(() => {
		const timer = window.setInterval(() => {
			// Draw random values outside the state updater, which React may replay.
			const movements = INITIAL.map(() => ({
				delta: (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 1.2),
				volume: 1 + Math.floor(Math.random() * 100),
			}))
			setQuotes((previous) => {
				return previous.map((quote, index) => {
					const movement = movements[index]
					const reference = REFERENCE_PRICES.get(quote.id)
					if (!movement || reference === undefined) return quote
					const price = Math.max(0.01, Math.round((quote.price + movement.delta) * 100) / 100)
					return {
						...quote,
						price,
						change: Math.round((price / reference - 1) * 10000) / 100,
						volume: quote.volume + movement.volume,
						trend: [...quote.trend.slice(1), price],
					}
				})
			})
		}, 1500)
		return () => {
			window.clearInterval(timer)
		}
	}, [])

	return (
		<div className='space-y-3'>
			<div className='flex items-center gap-2 text-xs text-zinc-500'>
				<span className='h-2 w-2 rounded-full bg-emerald-500' />
				Live simulation · select, sort, or filter
			</div>
			<DataGrid
				data={quotes}
				columns={columns}
				getRowId={(quote) => quote.id}
				sorting
				filtering
				selection
				flashing
			/>
		</div>
	)
}
