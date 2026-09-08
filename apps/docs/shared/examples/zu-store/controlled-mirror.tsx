'use client'

import { createContextStore } from '@ez-kit/zu-store'
import { useState } from 'react'
import { createStore } from 'zustand/vanilla'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type Theme = 'light' | 'dark'

type PreviewState = {
	/** Mirror field: it only ever flows in. Nothing inside the store writes it. */
	theme: Theme
	clicks: number
	registerClick: () => void
}

const previewStore = createContextStore(() =>
	createStore<PreviewState>()((set, get) => ({
		theme: 'light',
		clicks: 0,
		registerClick: () => {
			set({ clicks: get().clicks + 1 })
		},
	})),
)

function Preview() {
	const theme = previewStore.useSelector((s) => s.theme)
	const clicks = previewStore.useSelector((s) => s.clicks)
	const registerClick = previewStore.useSelector((s) => s.registerClick)

	return (
		<Card
			size='sm'
			className='gap-3 px-4'
		>
			<Badge variant='outline'>inside the store</Badge>
			<div className='flex items-center gap-2'>
				<Label className='text-muted-foreground'>theme — read-only in here</Label>
				<Badge variant='secondary'>{theme}</Badge>
			</div>
			<Button
				variant='outline'
				size='sm'
				className='self-start'
				onClick={registerClick}
			>
				local click #{clicks}
			</Button>
		</Card>
	)
}

export default function ControlledMirrorExample() {
	const [theme, setTheme] = useState<Theme>('light')

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-wrap items-center gap-3'>
				<Label className='text-muted-foreground'>parent owns theme</Label>
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

			{/* No `onValueChange`: the store never writes `theme`, so there is nothing to lift. */}
			<previewStore.Provider value={{ theme }}>
				<Preview />
			</previewStore.Provider>

			<p className='text-xs text-muted-foreground'>
				The local click counter keeps its own state across theme changes — only the keys listed in <code>value</code>{' '}
				are controlled.
			</p>
		</div>
	)
}
