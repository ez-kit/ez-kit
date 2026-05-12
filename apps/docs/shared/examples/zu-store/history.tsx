'use client'

import { useHistoryStore, withHistory } from '@ez-kit/zu-store'
import { useMemo } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

type CounterState = {
	count: number
}

function createHistoricalStore() {
	return withHistory(createStore<CounterState>()(() => ({ count: 0 })))
}

export default function HistoryExample() {
	const store = useMemo(() => createHistoricalStore(), [])
	const count = useStore(store, (s) => s.count)
	const pastsCount = useHistoryStore(store, (h) => h.pasts.length)
	const futuresCount = useHistoryStore(store, (h) => h.futures.length)
	const undo = useHistoryStore(store, (h) => h.undo)
	const redo = useHistoryStore(store, (h) => h.redo)
	const clear = useHistoryStore(store, (h) => h.clear)

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex items-center gap-3'>
				<button
					type='button'
					onClick={() => { store.set({ count: count + 1 }); }}
					className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
				>
					+1
				</button>
				<button
					type='button'
					onClick={() => { store.set({ count: count - 1 }); }}
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
		</div>
	)
}
