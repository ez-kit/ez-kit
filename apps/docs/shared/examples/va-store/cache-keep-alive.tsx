'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo writes the raw mutable proxy from useStore() */

import { CacheProvider, createCachedStore, useCacheKeys } from '@ez-kit/va-store'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { proxy } from 'valtio'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type TableState = {
	filter: string
	page: number
}

// A keep-alive group against the default cache. Cache-hits at the same `id` return the SAME proxy,
// so in-progress edits survive unmount/remount within `gcTime`. `createContextStore` is unchanged —
// reach for `createCachedStore` only when a store should outlive its Provider.
const tableStore = createCachedStore<TableState>(() => proxy<TableState>({ filter: 'all', page: 1 }), {
	name: 'demo-table',
})

const FILTERS = ['all', 'active', 'archived']

function TablePanel() {
	const snap = tableStore.useSnapshot()
	const store = tableStore.useStore() // the raw mutable proxy

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
					value={snap.filter}
					onValueChange={(next) => {
						if (next) store.filter = next
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
						store.page = Math.max(1, store.page - 1)
					}}
				>
					<MinusIcon />
				</Button>
				<output className='min-w-[2ch] text-center font-mono tabular-nums'>{snap.page}</output>
				<Button
					variant='outline'
					size='icon-sm'
					aria-label='Next page'
					onClick={() => {
						store.page += 1
					}}
				>
					<PlusIcon />
				</Button>
			</div>
		</Card>
	)
}

function Demo() {
	const [open, setOpen] = useState(true)
	// Reactive membership read: the group entry stays in `keys()` while it is kept alive, even when the
	// panel that owns its Provider is unmounted.
	const cached = useCacheKeys().some((record) => record.name === 'demo-table')

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-2'>
				<Button
					variant='outline'
					size='sm'
					onClick={() => {
						setOpen((on) => !on)
					}}
				>
					{open ? 'Close table' : 'Reopen table'}
				</Button>
				<span className='ml-auto text-xs text-muted-foreground'>
					cache <span className='font-mono'>{cached ? 'alive' : 'empty'}</span>
				</span>
			</div>

			{open ? (
				<tableStore.Provider id='main'>
					<TablePanel />
				</tableStore.Provider>
			) : (
				<Empty className='border'>
					<EmptyTitle>The table is unmounted</EmptyTitle>
					<EmptyDescription>
						Its filter and page are kept alive in the cache. Reopen it — your selection is exactly where you left it.
					</EmptyDescription>
				</Empty>
			)}
		</div>
	)
}

export default function CacheKeepAliveExample() {
	// Mount the default cache boundary once. No `createStoreCache` instance to create.
	return (
		<CacheProvider>
			<Demo />
		</CacheProvider>
	)
}
