'use client'

import { type ContextStoreInit, createStoreCache } from '@ez-kit/zu-store'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { createStore } from 'zustand/vanilla'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type TableState = {
	filter: string
	page: number
	setFilter: (filter: string) => void
	setPage: (page: number) => void
}

const cache = createStoreCache()

const tableStore = cache.createCachedStore(
	({ defaultValue }: ContextStoreInit<{ filter?: string }>) =>
		createStore<TableState>((set) => ({
			filter: defaultValue.filter ?? 'all',
			page: 1,
			setFilter: (filter) => {
				set({ filter })
			},
			setPage: (page) => {
				set({ page })
			},
		})),
	{ name: 'demo-table' },
)

const FILTERS = ['all', 'active', 'archived']

function TablePanel() {
	const filter = tableStore.useSelector((s) => s.filter)
	const page = tableStore.useSelector((s) => s.page)
	const setFilter = tableStore.useSelector((s) => s.setFilter)
	const setPage = tableStore.useSelector((s) => s.setPage)

	return (
		<Card
			size='sm'
			className='gap-3 px-4'
		>
			<div className='flex flex-wrap items-center gap-3'>
				<Label className='text-muted-foreground'>Filter</Label>
				<ToggleGroup
					type='single'
					variant='outline'
					size='sm'
					value={filter}
					onValueChange={(next) => {
						if (next) setFilter(next)
					}}
				>
					{FILTERS.map((value) => (
						<ToggleGroupItem
							key={value}
							value={value}
						>
							{value}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>
			<div className='flex items-center gap-3'>
				<Label className='text-muted-foreground'>Page</Label>
				<Button
					variant='outline'
					size='icon-sm'
					aria-label='Previous page'
					onClick={() => {
						setPage(Math.max(1, page - 1))
					}}
				>
					<MinusIcon />
				</Button>
				<output className='min-w-[2ch] text-center font-mono tabular-nums'>{page}</output>
				<Button
					variant='outline'
					size='icon-sm'
					aria-label='Next page'
					onClick={() => {
						setPage(page + 1)
					}}
				>
					<PlusIcon />
				</Button>
			</div>
		</Card>
	)
}

function Demo() {
	const [tab, setTab] = useState('table')
	// Passive cross-tree read: reflects the kept-alive store even while the table is unmounted.
	const keptFilter = tableStore.useFromCache({ id: 'main' }, (s) => s?.filter ?? '—')

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-3'>
				<Tabs
					value={tab}
					onValueChange={setTab}
				>
					<TabsList>
						<TabsTrigger value='table'>Table page</TabsTrigger>
						<TabsTrigger value='away'>Away</TabsTrigger>
					</TabsList>
				</Tabs>
				<span className='ml-auto text-xs text-muted-foreground'>
					kept filter <span className='font-mono'>{keptFilter}</span>
				</span>
			</div>

			{tab === 'table' ? (
				<tableStore.Provider
					id='main'
					defaultValue={{ filter: 'active' }}
				>
					<TablePanel />
				</tableStore.Provider>
			) : (
				<Empty className='border'>
					<EmptyTitle>The table is unmounted</EmptyTitle>
					<EmptyDescription>
						Its filter and page are kept alive in the cache. Switch back to <strong>Table page</strong> — your selection
						is preserved.
					</EmptyDescription>
				</Empty>
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
