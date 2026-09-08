'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo writes through the raw mutable proxy from useStore() */

import { createContextStore, pipe, useHistory, useTimeline, type ValtioOp, withHistory } from '@ez-kit/va-store'
import { RedoIcon, RotateCcwIcon, UndoIcon } from 'lucide-react'
import { useId } from 'react'
import { proxy } from 'valtio'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

import { type Adjustments, CHANNELS, NEUTRAL, Photo } from './history-photo'

/** A continuous drag emits a write per pointermove; anything closer than this folds into one step. */
const COALESCE_MS = 400

/**
 * Collapses a slider drag into a single undo step: the first write of a gesture records (so `undo`
 * returns to the pre-drag value), every follow-up write on the same key inside the window is vetoed.
 * `meta` is the batch's Valtio ops — `['set', path, value, previousValue]` — so `path[0]` is the key
 * that changed.
 */
function createDragCoalescer(): (prev: Adjustments, next: Adjustments, meta?: readonly ValtioOp[]) => boolean {
	let lastKey: string | symbol | undefined
	let lastAt = 0

	return (_prev, _next, meta) => {
		const key = meta?.[0]?.[1][0]
		const now = Date.now()
		const isSameGesture = key !== undefined && key === lastKey && now - lastAt < COALESCE_MS

		lastKey = key
		lastAt = now

		return !isSameGesture
	}
}

const adjustStore = createContextStore(() =>
	pipe(
		proxy<Adjustments>({ ...NEUTRAL }),
		withHistory({
			limit: 20,
			shouldRecord: createDragCoalescer(),
		}),
	),
)

function ChannelSlider({ channel }: { channel: (typeof CHANNELS)[number] }) {
	const id = useId()
	const snap = adjustStore.useSnapshot()
	const store = adjustStore.useStore() // the raw mutable proxy
	const value = snap[channel.key]

	return (
		<div className='grid gap-1.5'>
			<div className='flex items-baseline justify-between'>
				<Label htmlFor={id}>{channel.label}</Label>
				<span className='font-mono text-xs tabular-nums text-muted-foreground'>{value}%</span>
			</div>
			<Slider
				id={id}
				min={0}
				max={200}
				step={1}
				value={[value]}
				onValueChange={([next]) => {
					if (next !== undefined) store[channel.key] = next
				}}
			/>
		</div>
	)
}

/** `[...pasts, current, ...futures]` — the linear timeline `goto(index)` addresses. */
function Timeline() {
	const store = adjustStore.useStore()
	const { steps, index: currentIndex, goto } = useTimeline(store)

	return (
		<div className='flex flex-wrap items-center gap-1.5'>
			{steps.map((step, index) => (
				<button
					// The timeline is positional: an entry has no identity beyond where it sits.
					key={index}
					type='button'
					aria-label={`Go to step ${String(index + 1)} of ${String(steps.length)}`}
					aria-current={index === currentIndex}
					onClick={() => {
						goto(index)
					}}
					className={cn(
						'h-9 w-14 overflow-hidden rounded-md ring-offset-2 ring-offset-background transition',
						'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
						index === currentIndex
							? 'ring-2 ring-primary'
							: index > currentIndex
								? 'opacity-40 hover:opacity-75'
								: 'opacity-70 hover:opacity-100',
					)}
				>
					<Photo adjustments={step} />
				</button>
			))}
		</div>
	)
}

function Editor() {
	const store = adjustStore.useStore()
	const snap = adjustStore.useSnapshot()
	const { undo, redo, canUndo, canRedo } = useHistory(store)

	return (
		<div className='grid gap-5'>
			<div className='grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'>
				<div className='aspect-[16/10] overflow-hidden rounded-xl border'>
					<Photo
						adjustments={snap}
						label='Preview of the adjusted photograph'
					/>
				</div>
				<div className='grid content-start gap-4'>
					{CHANNELS.map((channel) => (
						<ChannelSlider
							key={channel.key}
							channel={channel}
						/>
					))}
				</div>
			</div>

			<div className='flex flex-wrap items-center gap-2'>
				<Button
					variant='outline'
					size='sm'
					disabled={!canUndo}
					onClick={undo}
				>
					<UndoIcon />
					Undo
				</Button>
				<Button
					variant='outline'
					size='sm'
					disabled={!canRedo}
					onClick={redo}
				>
					<RedoIcon />
					Redo
				</Button>
				<Button
					variant='ghost'
					size='sm'
					onClick={() => {
						Object.assign(store, NEUTRAL)
					}}
				>
					<RotateCcwIcon />
					Reset
				</Button>
			</div>

			<div className='grid gap-2 rounded-2xl border bg-muted/40 p-3'>
				<span className='text-xs text-muted-foreground'>
					History — click a frame to <code>goto()</code> it
				</span>
				<Timeline />
			</div>
		</div>
	)
}

export default function HistoryImageAdjustExample() {
	return (
		<adjustStore.Provider>
			<Editor />
		</adjustStore.Provider>
	)
}
