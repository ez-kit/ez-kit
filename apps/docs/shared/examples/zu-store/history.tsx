'use client'

import { withHistory } from '@ez-kit/zu-store'
import { useMemo } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

type CounterState = {
	count: number
	increment: () => void
	decrement: () => void
}

function createHistoricalStore() {
	return createStore<CounterState>()(
		withHistory((set) => ({
			count: 0,
			increment: () => {
				set((s) => ({ count: s.count + 1 }))
			},
			decrement: () => {
				set((s) => ({ count: s.count - 1 }))
			},
		})),
	)
}

export default function HistoryExample() {
	const store = useMemo(() => createHistoricalStore(), [])

	const count = useStore(store, (s) => s.count)
	const increment = useStore(store, (s) => s.increment)
	const decrement = useStore(store, (s) => s.decrement)

	const pastsCount = useStore(store.history, (h) => h.pasts.length)
	const futuresCount = useStore(store.history, (h) => h.futures.length)
	const undo = useStore(store.history, (h) => h.undo)
	const redo = useStore(store.history, (h) => h.redo)
	const clear = useStore(store.history, (h) => h.clear)
	const goto = useStore(store.history, (h) => h.goto)

	const timelineLength = pastsCount + 1 + futuresCount

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex items-center gap-3'>
				<button
					type='button'
					onClick={increment}
					className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
				>
					+1
				</button>
				<button
					type='button'
					onClick={decrement}
					className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
				>
					−1
				</button>
				<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{count}</output>
			</div>

			<div className='flex flex-wrap items-center gap-2'>
				<button
					type='button'
					onClick={undo}
					disabled={pastsCount === 0}
					className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted disabled:cursor-not-allowed disabled:opacity-40'
				>
					Undo
				</button>
				<button
					type='button'
					onClick={redo}
					disabled={futuresCount === 0}
					className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted disabled:cursor-not-allowed disabled:opacity-40'
				>
					Redo
				</button>
				<button
					type='button'
					onClick={clear}
					className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground'
				>
					Clear history
				</button>
				<span className='ml-1 text-xs text-fd-muted-foreground'>
					pasts: <span className='font-mono'>{pastsCount}</span> · futures:{' '}
					<span className='font-mono'>{futuresCount}</span>
				</span>
			</div>

			{timelineLength > 1 && (
				<div className='flex items-center gap-3'>
					<span className='text-xs text-fd-muted-foreground'>Jump:</span>
					<input
						type='range'
						min={0}
						max={timelineLength - 1}
						value={pastsCount}
						onChange={(e) => {
							goto(Number(e.target.value))
						}}
						className='flex-1 accent-fd-primary'
					/>
					<span className='font-mono text-xs tabular-nums text-fd-muted-foreground'>
						{pastsCount} / {timelineLength - 1}
					</span>
				</div>
			)}
		</div>
	)
}
