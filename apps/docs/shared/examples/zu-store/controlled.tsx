'use client'

import { type ContextStoreInit, createContextStore } from '@ez-kit/zu-store'
import { useCallback, useId, useState } from 'react'
import { createStore } from 'zustand/vanilla'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

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

const panelStore = createContextStore(({ defaultValue }: ContextStoreInit<PanelDefaultValue>) =>
	createStore<PanelState>()((set, get) => ({
		theme: 'light',
		count: 0,
		note: defaultValue.note ?? '',
		increment: () => {
			set({ count: get().count + 1 })
		},
		setNote: (note) => {
			set({ note })
		},
	})),
)

function Panel() {
	const noteId = useId()
	const theme = panelStore.useSelector((s) => s.theme)
	const count = panelStore.useSelector((s) => s.count)
	const note = panelStore.useSelector((s) => s.note)
	const increment = panelStore.useSelector((s) => s.increment)
	const setNote = panelStore.useSelector((s) => s.setNote)

	return (
		<Card
			size='sm'
			className='gap-3 px-4'
		>
			<Badge variant='outline'>inside the store</Badge>

			<div className='flex items-center gap-2'>
				<Label className='text-muted-foreground'>theme (mirror)</Label>
				<Badge variant='secondary'>{theme}</Badge>
			</div>

			<div className='flex items-center gap-3'>
				<Label className='text-muted-foreground'>count (controlled)</Label>
				<output className='min-w-[3ch] text-center font-mono text-lg tabular-nums'>{count}</output>
				<Button
					variant='outline'
					size='sm'
					onClick={increment}
				>
					+1
				</Button>
			</div>

			<div className='flex items-center gap-2'>
				<Label
					htmlFor={noteId}
					className='text-muted-foreground'
				>
					note (uncontrolled)
				</Label>
				<Input
					id={noteId}
					className='w-48'
					value={note}
					placeholder='type here…'
					onChange={(event) => {
						setNote(event.target.value)
					}}
				/>
			</div>
		</Card>
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
			<Card
				size='sm'
				className='gap-3 px-4'
			>
				<Badge variant='outline'>owned by the parent</Badge>

				<div className='flex flex-wrap items-center gap-3'>
					<Label className='text-muted-foreground'>theme</Label>
					<ToggleGroup
						type='single'
						variant='outline'
						size='sm'
						value={theme}
						onValueChange={(next) => {
							if (next) setTheme(next as Theme)
						}}
					>
						<ToggleGroupItem value='light'>light</ToggleGroupItem>
						<ToggleGroupItem value='dark'>dark</ToggleGroupItem>
					</ToggleGroup>
				</div>

				<div className='flex flex-wrap items-center gap-3'>
					<Label className='text-muted-foreground'>count</Label>
					<output className='min-w-[3ch] text-center font-mono tabular-nums'>{count}</output>
					<Button
						variant='outline'
						size='sm'
						onClick={() => {
							setCount(0)
						}}
					>
						Reset from parent
					</Button>
				</div>
			</Card>

			<panelStore.Provider
				defaultValue={{ note: 'seeded once' }}
				value={{ theme, count }}
				onValueChange={handleValueChange}
			>
				<Panel />
			</panelStore.Provider>

			<p className='text-xs text-muted-foreground'>
				<code>theme</code> only ever flows down — nothing inside writes it. <code>count</code> is written inside the
				store, lifted through <code>onValueChange</code>, and flows back down. <code>note</code> was seeded from{' '}
				<code>defaultValue</code> and the parent never sees it.
			</p>
		</div>
	)
}
