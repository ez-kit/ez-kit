'use client'

import { type ContextStoreInit, createContextStore } from '@ez-kit/va-store'
import { useCallback, useState } from 'react'
import { proxy } from 'valtio'

type Theme = 'light' | 'dark'

type PanelState = {
	/** Mirror field: the parent owns it, nothing inside the store ever writes it. */
	theme: Theme
	/** Fully controlled: written from inside the store, lifted back up via `onValueChange`. */
	count: number
	/** Uncontrolled: seeded once from `defaultValue`, then lives its own life. */
	note: string
	increment: () => void
	setNote: (note: string) => void
}

type PanelDefaultValue = {
	note?: string
}

const panelStore = createContextStore(({ defaultValue }: ContextStoreInit<PanelDefaultValue>) => {
	const state = proxy<PanelState>({
		theme: 'light',
		count: 0,
		note: defaultValue.note ?? '',
		increment: () => {
			state.count += 1
		},
		setNote: (note) => {
			state.note = note
		},
	})

	return state
})

function Panel() {
	const snap = panelStore.useSnapshot()

	return (
		<div
			className={`flex flex-col gap-3 rounded-md border p-3 ${
				snap.theme === 'dark'
					? 'border-fd-foreground bg-fd-foreground text-fd-background'
					: 'border-fd-border bg-fd-card'
			}`}
		>
			<p className='text-xs uppercase tracking-wider opacity-70'>inside the store</p>

			<div className='flex items-center gap-2 text-sm'>
				<span className='opacity-70'>theme (mirror):</span>
				<code className='font-mono'>{snap.theme}</code>
			</div>

			<div className='flex items-center gap-3'>
				<span className='text-sm opacity-70'>count (controlled):</span>
				<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{snap.count}</output>
				<button
					type='button'
					onClick={snap.increment}
					className='rounded-md border border-current px-3 py-1 text-sm font-medium opacity-80 hover:opacity-100'
				>
					+1
				</button>
			</div>

			<label className='flex items-center gap-2 text-sm'>
				<span className='opacity-70'>note (uncontrolled):</span>
				<input
					value={snap.note}
					onChange={(event) => {
						snap.setNote(event.target.value)
					}}
					className='rounded-md border border-current bg-transparent px-2 py-1 text-sm'
					placeholder='type here…'
				/>
			</label>
		</div>
	)
}

export default function ControlledExample() {
	const [theme, setTheme] = useState<Theme>('light')
	const [count, setCount] = useState(0)

	// Memoised: a fresh identity every render would make the Provider re-run its sync every render.
	const handleValueChange = useCallback((next: Partial<PanelState>) => {
		// Only the controlled keys the store itself changed arrive here — so `count` can show up,
		// but `theme` never can: it is a mirror, and nothing inside the store writes it.
		if (next.count !== undefined) setCount(next.count)
	}, [])

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col gap-3 rounded-md border border-fd-border bg-fd-muted/40 p-3'>
				<p className='text-xs uppercase tracking-wider text-fd-muted-foreground'>owned by the parent</p>

				<div className='flex flex-wrap items-center gap-2'>
					<span className='text-sm text-fd-muted-foreground'>theme:</span>
					{(['light', 'dark'] as const).map((option) => (
						<button
							key={option}
							type='button'
							onClick={() => {
								setTheme(option)
							}}
							className={`rounded-md border px-3 py-1 text-sm font-medium ${
								theme === option
									? 'border-fd-primary bg-fd-primary text-fd-primary-foreground'
									: 'border-fd-border bg-fd-card hover:bg-fd-muted'
							}`}
						>
							{option}
						</button>
					))}
				</div>

				<div className='flex flex-wrap items-center gap-2'>
					<span className='text-sm text-fd-muted-foreground'>count:</span>
					<output className='min-w-[3ch] text-center font-mono text-sm tabular-nums'>{count}</output>
					<button
						type='button'
						onClick={() => {
							setCount(0)
						}}
						className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
					>
						reset from parent
					</button>
				</div>
			</div>

			<panelStore.Provider
				defaultValue={{ note: 'seeded once' }}
				value={{ theme, count }}
				onValueChange={handleValueChange}
			>
				<Panel />
			</panelStore.Provider>

			<p className='text-xs text-fd-muted-foreground'>
				<code className='font-mono'>theme</code> only ever flows down — nothing inside writes it.{' '}
				<code className='font-mono'>count</code> is written inside the store, lifted through{' '}
				<code className='font-mono'>onValueChange</code>, and flows back down. <code className='font-mono'>note</code>{' '}
				was seeded from <code className='font-mono'>defaultValue</code> and the parent never sees it.
			</p>
		</div>
	)
}
