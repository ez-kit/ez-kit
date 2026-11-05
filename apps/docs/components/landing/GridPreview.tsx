'use client'

import { useState } from 'react'

import { ExampleFrame } from '@/components/example-frame'

type Kit = 'shadcn' | 'heroui'

export function GridPreview() {
	const [kit, setKit] = useState<Kit>('shadcn')

	return (
		<div className='min-w-0 overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-[0_20px_70px_-25px_rgba(72,45,130,0.25)] dark:border-white/10 dark:bg-zinc-950'>
			<div className='flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800'>
				<div>
					<p className='text-sm font-semibold text-zinc-900 dark:text-white'>Market watch · Data Grid</p>
					<p className='text-xs text-zinc-500 dark:text-zinc-400'>One grid, two UI kits</p>
				</div>
				<div
					aria-label='Choose a UI kit'
					className='flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900'
				>
					{(['shadcn', 'heroui'] as const).map((value) => (
						<button
							key={value}
							type='button'
							aria-pressed={kit === value}
							onClick={() => {
								setKit(value)
							}}
							className={
								kit === value
									? 'rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm dark:bg-zinc-800 dark:text-violet-300'
									: 'rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
							}
						>
							{value === 'shadcn' ? 'shadcn/ui' : 'HeroUI'}
						</button>
					))}
				</div>
			</div>
			<div className='p-2 sm:p-4'>
				<ExampleFrame
					key={kit}
					kit={kit}
					slug='landing-grid'
				/>
			</div>
			<div className='border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60'>
				<p className='mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400'>
					Same grid configuration, different UI kit · simulated data
				</p>
				<code className='block overflow-x-auto whitespace-nowrap font-mono text-xs leading-6 text-violet-800 dark:text-violet-300'>
					&lt;DataGrid data={'{quotes}'} columns={'{columns}'} sorting filtering selection flashing /&gt;
				</code>
			</div>
		</div>
	)
}
