'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo writes the raw mutable proxy from useStore() */

import { CacheProvider, createCachedStore, useCacheKeys } from '@ez-kit/valtio-kit'
import { useState } from 'react'
import { proxy } from 'valtio'

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
		<div className='flex flex-col gap-3 rounded-lg border border-fd-border bg-fd-card p-4'>
			<div className='flex flex-wrap items-center gap-2'>
				<span className='text-xs text-fd-muted-foreground'>Filter:</span>
				{FILTERS.map((value) => (
					<button
						key={value}
						type='button'
						onClick={() => {
							store.filter = value
						}}
						className={`rounded-full border px-3 py-0.5 text-xs font-medium ${
							snap.filter === value
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
						store.page = Math.max(1, store.page - 1)
					}}
					className='rounded-md border border-fd-border bg-fd-card px-2 py-0.5 text-sm hover:bg-fd-muted'
				>
					−
				</button>
				<output className='min-w-[2ch] text-center font-mono tabular-nums'>{snap.page}</output>
				<button
					type='button'
					onClick={() => {
						store.page += 1
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
	const [open, setOpen] = useState(true)
	// Reactive membership read: the group entry stays in `keys()` while it is kept alive, even when the
	// panel that owns its Provider is unmounted.
	const cached = useCacheKeys().some((record) => record.name === 'demo-table')

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-2'>
				<button
					type='button'
					onClick={() => {
						setOpen((on) => !on)
					}}
					className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted'
				>
					{open ? 'Close table' : 'Reopen table'}
				</button>
				<span className='ml-auto text-xs text-fd-muted-foreground'>
					cache: <span className='font-mono'>{cached ? 'alive' : 'empty'}</span>
				</span>
			</div>

			{open ? (
				<tableStore.Provider id='main'>
					<TablePanel />
				</tableStore.Provider>
			) : (
				<p className='rounded-lg border border-dashed border-fd-border p-4 text-sm text-fd-muted-foreground'>
					The table is unmounted, but its filter and page are kept alive in the cache. Reopen it — your
					selection is exactly where you left it.
				</p>
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
