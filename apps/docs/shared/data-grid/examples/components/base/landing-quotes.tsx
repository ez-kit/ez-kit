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
	const points = value.map((point, index) => `${String(index * 10)},${String(40 - point)}`).join(' ')
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
	const [quotes, setQuotes] = useState(INITIAL)
	const [running, setRunning] = useState(false)

	useEffect(() => {
		if (!running) return
		const timer = window.setInterval(() => {
			setQuotes((previous) => {
				const selected = Math.floor(Math.random() * previous.length)
				return previous.map((quote, index) => {
					if (index !== selected) return quote
					const delta = (Math.random() - 0.5) * 2
					return {
						...quote,
						price: Math.round((quote.price + delta) * 100) / 100,
						change: Math.round((quote.change + delta / 10) * 100) / 100,
						volume: quote.volume + Math.floor(Math.random() * 100),
						trend: [
							...quote.trend.slice(1),
							Math.max(5, Math.min(35, (quote.trend.at(-1) ?? 20) + Math.round(delta * 4))),
						],
					}
				})
			})
		}, 1800)
		return () => {
			window.clearInterval(timer)
		}
	}, [running])

	return (
		<div className='space-y-3'>
			<div className='flex items-center justify-between gap-3 text-xs'>
				<span className='text-zinc-500'>Simulated market data · select, sort, or filter</span>
				<button
					type='button'
					onClick={() => {
						setRunning(!running)
					}}
					aria-pressed={running}
					className='rounded-md border border-violet-200 px-3 py-1.5 font-medium text-violet-700 dark:border-violet-800 dark:text-violet-300'
				>
					{running ? 'Pause updates' : 'Start live updates'}
				</button>
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
