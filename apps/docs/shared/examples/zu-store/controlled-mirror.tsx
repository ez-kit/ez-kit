'use client'

import { createContextStore } from '@ez-kit/zu-store'
import { useState } from 'react'
import { createStore } from 'zustand/vanilla'

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
		<div
			className={`flex flex-col gap-3 rounded-md border p-3 ${
				theme === 'dark' ? 'border-fd-foreground bg-fd-foreground text-fd-background' : 'border-fd-border bg-fd-card'
			}`}
		>
			<p className='text-xs uppercase tracking-wider opacity-70'>inside the store</p>
			<p className='text-sm'>
				theme is <code className='font-mono'>{theme}</code> — read-only in here
			</p>
			<button
				type='button'
				onClick={registerClick}
				className='self-start rounded-md border border-current px-3 py-1 text-sm font-medium opacity-80 hover:opacity-100'
			>
				local click #{clicks}
			</button>
		</div>
	)
}

export default function ControlledMirrorExample() {
	const [theme, setTheme] = useState<Theme>('light')

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-wrap items-center gap-2'>
				<span className='text-sm text-fd-muted-foreground'>parent owns theme:</span>
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

			{/* No `onValueChange`: the store never writes `theme`, so there is nothing to lift. */}
			<previewStore.Provider value={{ theme }}>
				<Preview />
			</previewStore.Provider>

			<p className='text-xs text-fd-muted-foreground'>
				The local click counter keeps its own state across theme changes — only the keys listed in{' '}
				<code className='font-mono'>value</code> are controlled.
			</p>
		</div>
	)
}
