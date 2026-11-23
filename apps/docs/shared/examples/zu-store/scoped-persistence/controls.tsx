'use client'

import { usePersistence, usePersistStatus } from '@ez-kit/zu-store/persist'
import { useState, useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'

import { deliverServerRead, readSavedWidth, subscribeReadout } from './server'
import { type browserPanel, scope } from './store'

export function LayoutPanel({ group, label }: { group: typeof browserPanel; label: string }) {
	const store = group.useStore()
	const width = group.useSelector((state) => state.width)
	const status = usePersistStatus(store)
	return (
		<section
			className='space-y-3 rounded-xl border p-4'
			aria-label={`${label} layout`}
		>
			<h3 className='font-medium'>{label}</h3>
			<p role='status'>
				{label} restore: {status.restore}; write: {status.write}
			</p>
			{status.restore === 'pending' ? (
				<p>Restoring {label.toLowerCase()} layout…</p>
			) : (
				<>
					<label className='flex flex-col gap-2'>
						{label} width: {width}px
						<input
							type='range'
							min={200}
							max={800}
							step={10}
							value={width}
							aria-label={`${label} width`}
							onChange={(event) => {
								store.setState({ width: event.currentTarget.valueAsNumber })
							}}
						/>
					</label>
					<div className='overflow-hidden rounded-lg border'>
						<div
							className='h-8 bg-primary/20'
							style={{ width }}
						/>
					</div>
					<Button
						variant='outline'
						onClick={() => {
							store.setState({ width: 500 })
						}}
					>
						Set {label.toLowerCase()} width to 500
					</Button>
				</>
			)}
		</section>
	)
}

export function Controls() {
	const persistence = usePersistence()
	const saved = useSyncExternalStore(subscribeReadout, readSavedWidth, () => '720')
	const [error, setError] = useState('')
	const reset = (): void => {
		void persistence.resetScope({ path: scope, sources: ['browser', 'server'] }).then(
			(outcomes) => {
				setError(
					Object.values(outcomes).some((outcome) => outcome.status === 'rejected')
						? 'Some settings could not be deleted. Retry reset.'
						: '',
				)
			},
			() => {
				setError('Settings could not be deleted. Retry reset.')
			},
		)
	}
	return (
		<div className='space-y-3'>
			<p>Server starts with 720px. Wait two seconds, change the panel, then deliver the old read.</p>
			<div className='flex flex-wrap gap-2'>
				<Button
					variant='outline'
					onClick={deliverServerRead}
				>
					Deliver server read
				</Button>
				<Button
					variant='outline'
					onClick={reset}
				>
					Reset page layout
				</Button>
			</div>
			<p data-testid='saved-server-width'>Stored server width: {saved}</p>
			{error ? <p role='alert'>{error}</p> : null}
		</div>
	)
}
