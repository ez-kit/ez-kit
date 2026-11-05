'use client'

import { useState } from 'react'

import { ExampleFrame } from '@/components/example-frame'

const GRID_CODE = `const columns = createColumns<Quote>([
  { accessorKey: 'symbol', header: 'Asset', width: 150,
    cell: { component: SymbolCell } },
  { accessorKey: 'price', header: 'Price',
    cell: { type: 'number', config: { decimals: 2 } },
    flashing: { status: (previous, next) =>
      next > previous ? 'success' : 'error' } },
  { accessorKey: 'change', header: 'Change', cell: { component: ChangeCell } },
  { accessorKey: 'volume', header: 'Volume', cell: { type: 'number' } },
  { accessorKey: 'trend', header: 'Trend', cell: { component: TrendCell },
    flashing: false, filtering: false, sorting: false },
])

<DataGrid
  data={quotes} columns={columns} getRowId={(quote) => quote.id}
  sorting filtering selection flashing
/>`

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
			<details
				open
				className='border-t border-zinc-200 bg-[#181522] text-violet-100 dark:border-zinc-800'
			>
				<summary className='cursor-pointer px-5 py-3 text-xs font-medium text-violet-200'>
					View grid configuration · data simulation and cell renderers omitted
				</summary>
				<pre className='max-h-80 overflow-auto px-5 pb-5 text-xs leading-6'>
					<code>{GRID_CODE}</code>
				</pre>
			</details>
		</div>
	)
}
