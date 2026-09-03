'use client'

import { withHistory } from '@ez-kit/zu-store'
import { MinusIcon, PlusIcon, Redo2Icon, Undo2Icon } from 'lucide-react'
import { useMemo } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

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
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-3'>
				<Button
					variant='outline'
					size='icon-sm'
					aria-label='Decrement'
					onClick={decrement}
				>
					<MinusIcon />
				</Button>
				<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{count}</output>
				<Button
					variant='outline'
					size='icon-sm'
					aria-label='Increment'
					onClick={increment}
				>
					<PlusIcon />
				</Button>
			</div>

			<div className='flex flex-wrap items-center gap-2'>
				<Button
					variant='outline'
					size='sm'
					onClick={undo}
					disabled={pastsCount === 0}
				>
					<Undo2Icon />
					Undo
				</Button>
				<Button
					variant='outline'
					size='sm'
					onClick={redo}
					disabled={futuresCount === 0}
				>
					<Redo2Icon />
					Redo
				</Button>
				<Button
					variant='ghost'
					size='sm'
					onClick={clear}
				>
					Clear history
				</Button>
				<span className='text-xs text-muted-foreground'>
					pasts <span className='font-mono tabular-nums'>{pastsCount}</span> · futures{' '}
					<span className='font-mono tabular-nums'>{futuresCount}</span>
				</span>
			</div>

			{timelineLength > 1 && (
				<div className='flex items-center gap-3'>
					<Label className='text-muted-foreground'>Jump</Label>
					<Slider
						className='flex-1'
						min={0}
						max={timelineLength - 1}
						value={[pastsCount]}
						onValueChange={([next]) => {
							goto(next ?? 0)
						}}
					/>
					<span className='font-mono text-xs tabular-nums text-muted-foreground'>
						{pastsCount} / {timelineLength - 1}
					</span>
				</div>
			)}
		</div>
	)
}
