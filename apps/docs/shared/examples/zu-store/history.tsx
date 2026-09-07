'use client'

import { useHistory, useTimeline, withHistory } from '@ez-kit/zu-store'
import { MinusIcon, PlusIcon, Redo2Icon, Undo2Icon } from 'lucide-react'
import { useMemo } from 'react'
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

	const { undo, redo, clear, canUndo, canRedo, pasts, futures } = useHistory(store)
	const { steps, index, current, goto } = useTimeline(store)
	const { count, increment, decrement } = current

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
					disabled={!canUndo}
				>
					<Undo2Icon />
					Undo
				</Button>
				<Button
					variant='outline'
					size='sm'
					onClick={redo}
					disabled={!canRedo}
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
					pasts <span className='font-mono tabular-nums'>{pasts.length}</span> · futures{' '}
					<span className='font-mono tabular-nums'>{futures.length}</span>
				</span>
			</div>

			{steps.length > 1 && (
				<div className='flex items-center gap-3'>
					<Label className='text-muted-foreground'>Jump</Label>
					<Slider
						className='flex-1'
						min={0}
						max={steps.length - 1}
						value={[index]}
						onValueChange={([next]) => {
							goto(next ?? 0)
						}}
					/>
					<span className='font-mono text-xs tabular-nums text-muted-foreground'>
						{index} / {steps.length - 1}
					</span>
				</div>
			)}
		</div>
	)
}
