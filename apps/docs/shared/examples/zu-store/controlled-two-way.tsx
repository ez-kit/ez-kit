'use client'

import { createContextStore } from '@ez-kit/zu-store'
import { useCallback, useState } from 'react'
import { createStore } from 'zustand/vanilla'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

const LAST_STEP = 3

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
			set({ step: Math.min(get().step + 1, LAST_STEP) })
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
		<Card
			size='sm'
			className='gap-3 px-4'
		>
			<Badge variant='outline'>inside the store</Badge>
			<div className='flex items-center gap-3'>
				<Progress value={(step / LAST_STEP) * 100} />
				<span className='shrink-0 font-mono text-sm tabular-nums'>
					step {step}/{LAST_STEP}
				</span>
			</div>
			<div className='flex gap-2'>
				<Button
					variant='outline'
					size='sm'
					onClick={previous}
					disabled={step === 0}
				>
					Back
				</Button>
				<Button
					variant='outline'
					size='sm'
					onClick={next}
					disabled={step === LAST_STEP}
				>
					Next
				</Button>
			</div>
		</Card>
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
			<div className='flex flex-wrap items-center gap-3'>
				<Label className='text-muted-foreground'>parent knows the step</Label>
				<output className='font-mono text-sm tabular-nums'>{step}</output>
				<Button
					variant='outline'
					size='sm'
					onClick={() => {
						setStep(0)
					}}
				>
					Restart from parent
				</Button>
			</div>

			<stepperStore.Provider
				value={{ step }}
				onValueChange={handleValueChange}
			>
				<Stepper />
			</stepperStore.Provider>

			<p className='text-xs text-muted-foreground'>
				The store writes <code>step</code>, <code>onValueChange</code> hands the change up, and the parent feeds a new{' '}
				<code>value</code> back down — so both sides always agree.
			</p>
		</div>
	)
}
