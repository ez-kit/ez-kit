'use client'

import { createContextStore } from '@ez-kit/zu-store'
import { useCallback, useState } from 'react'
import { createStore } from 'zustand/vanilla'

type StepperState = {
	/** Fully controlled: written from inside, lifted up, then flows back down. */
	step: number
	next: () => void
	previous: () => void
}

const stepperStore = createContextStore(() =>
	createStore<StepperState>()((set, get) => ({
		step: 0,
		next: () => {
			set({ step: Math.min(get().step + 1, 3) })
		},
		previous: () => {
			set({ step: Math.max(get().step - 1, 0) })
		},
	})),
)

function Stepper() {
	const step = stepperStore.useSelector((s) => s.step)
	const next = stepperStore.useSelector((s) => s.next)
	const previous = stepperStore.useSelector((s) => s.previous)

	return (
		<div className='flex flex-col gap-3 rounded-md border border-fd-border bg-fd-card p-3'>
			<p className='text-xs uppercase tracking-wider text-fd-muted-foreground'>inside the store</p>
			<div className='flex items-center gap-2'>
				{[0, 1, 2, 3].map((index) => (
					<span
						key={index}
						className={`size-2.5 rounded-full ${index <= step ? 'bg-fd-primary' : 'bg-fd-border'}`}
					/>
				))}
				<span className='ml-2 font-mono text-sm tabular-nums'>step {step}</span>
			</div>
			<div className='flex gap-2'>
				<button
					type='button'
					onClick={previous}
					className='rounded-md border border-fd-border px-3 py-1 text-sm font-medium hover:bg-fd-muted'
				>
					back
				</button>
				<button
					type='button'
					onClick={next}
					className='rounded-md border border-fd-border px-3 py-1 text-sm font-medium hover:bg-fd-muted'
				>
					next
				</button>
			</div>
		</div>
	)
}

export default function ControlledTwoWayExample() {
	const [step, setStep] = useState(0)

	// Memoised: a fresh identity every render would make the Provider re-run its sync every render.
	const handleValueChange = useCallback((next: Partial<StepperState>) => {
		if (next.step !== undefined) setStep(next.step)
	}, [])

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-wrap items-center gap-2 rounded-md border border-fd-border bg-fd-muted/40 p-3'>
				<span className='text-sm text-fd-muted-foreground'>parent knows the step:</span>
				<output className='font-mono text-sm tabular-nums'>{step}</output>
				<button
					type='button'
					onClick={() => {
						setStep(0)
					}}
					className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
				>
					restart from parent
				</button>
			</div>

			<stepperStore.Provider
				value={{ step }}
				onValueChange={handleValueChange}
			>
				<Stepper />
			</stepperStore.Provider>

			<p className='text-xs text-fd-muted-foreground'>
				The store writes <code className='font-mono'>step</code>, <code className='font-mono'>onValueChange</code> hands
				the change up, and the parent feeds a new <code className='font-mono'>value</code> back down — so both sides
				always agree.
			</p>
		</div>
	)
}
