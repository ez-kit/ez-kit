'use client'

import { createStoreCache } from '@ez-kit/zu-store'
import { useState } from 'react'
import { createStore } from 'zustand/vanilla'

type TableState = {
	filter: string
	page: number
	setFilter: (filter: string) => void
	setPage: (page: number) => void
}

const cache = createStoreCache()

const tableStore = cache.defineStore('demo-table', (defaultProps: { filter?: string }) =>
	createStore<TableState>((set) => ({
		filter: defaultProps.filter ?? 'all',
		page: 1,
		setFilter: (filter) => {
			set({ filter })
		},
		setPage: (page) => {
			set({ page })
		},
	})),
)

const FILTERS = ['all', 'active', 'archived']

const tabClass = (active: boolean) =>
	`rounded-md border px-3 py-1 text-sm font-medium ${
		active ? 'border-fd-primary bg-fd-primary/10 text-fd-primary' : 'border-fd-border bg-fd-card hover:bg-fd-muted'
	}`

function TablePanel() {
	const filter = tableStore.useStore((s) => s.filter)
	const page = tableStore.useStore((s) => s.page)
	const setFilter = tableStore.useStore((s) => s.setFilter)
	const setPage = tableStore.useStore((s) => s.setPage)

	return (
		<div className='flex flex-col gap-3 rounded-lg border border-fd-border bg-fd-card p-4'>
			<div className='flex flex-wrap items-center gap-2'>
				<span className='text-xs text-fd-muted-foreground'>Filter:</span>
				{FILTERS.map((value) => (
					<button
						key={value}
						type='button'
						onClick={() => {
							setFilter(value)
						}}
						className={`rounded-full border px-3 py-0.5 text-xs font-medium ${
							filter === value
								? 'border-fd-primary bg-fd-primary/10 text-fd-primary'
								: 'border-fd-border hover:bg-fd-muted'
						}`}
					>
						{value}
					</button>
				))}
			</div>
			<div className='flex items-center gap-3'>
				<span className='text-xs text-fd-muted-foreground'>Page:</span>
				<button
					type='button'
					onClick={() => {
						setPage(Math.max(1, page - 1))
					}}
					className='rounded-md border border-fd-border bg-fd-card px-2 py-0.5 text-sm hover:bg-fd-muted'
				>
					−
				</button>
				<output className='min-w-[2ch] text-center font-mono tabular-nums'>{page}</output>
				<button
					type='button'
					onClick={() => {
						setPage(page + 1)
					}}
					className='rounded-md border border-fd-border bg-fd-card px-2 py-0.5 text-sm hover:bg-fd-muted'
				>
					+
				</button>
			</div>
		</div>
	)
}

function Demo() {
	const [tab, setTab] = useState<'table' | 'away'>('table')
	// Passive cross-tree read: reflects the kept-alive store even while the table is unmounted.
	const keptFilter = tableStore.useFromCache({ cacheKey: 'main' }, (s) => s?.filter ?? '—')

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-2'>
				<button
					type='button'
					onClick={() => {
						setTab('table')
					}}
					className={tabClass(tab === 'table')}
				>
					Table page
				</button>
				<button
					type='button'
					onClick={() => {
						setTab('away')
					}}
					className={tabClass(tab === 'away')}
				>
					Away
				</button>
				<span className='ml-auto text-xs text-fd-muted-foreground'>
					kept filter: <span className='font-mono'>{keptFilter}</span>
				</span>
			</div>

			{tab === 'table' ? (
				<tableStore.Provider
					cacheKey='main'
					defaultProps={{ filter: 'active' }}
				>
					<TablePanel />
				</tableStore.Provider>
			) : (
				<p className='rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground'>
					The table is unmounted, but its filter and page are kept alive in the cache. Switch back to
					<strong className='text-fd-foreground'> Table page</strong> — your selection is preserved.
				</p>
			)}
		</div>
	)
}

export default function StoreCacheExample() {
	return (
		<cache.Provider>
			<Demo />
		</cache.Provider>
	)
}
