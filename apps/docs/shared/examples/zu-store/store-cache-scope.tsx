'use client'

import { createStoreCache, toTree } from '@ez-kit/zu-store'
import { useState } from 'react'
import { createStore } from 'zustand/vanilla'

type TableState = {
	filter: string
	setFilter: (filter: string) => void
}

const cache = createStoreCache()

// One store group, defined once.
const userTable = cache.defineStore('user-table', (defaultProps: { filter?: string }) =>
	createStore<TableState>((set) => ({
		filter: defaultProps.filter ?? 'all',
		setFilter: (filter) => {
			set({ filter })
		},
	})),
)

const FILTERS = ['all', 'active', 'archived']

// Reusable table: it knows ONLY its own id, nothing about where it is mounted.
// The enclosing <cache.Scope> decides its namespace, so two mounts never collide.
function UserTable({ userId }: { userId: string }) {
	const filter = userTable.useStore((s) => s.filter)
	const setFilter = userTable.useStore((s) => s.setFilter)

	return (
		<div className='flex flex-wrap items-center gap-2'>
			<span className='text-xs text-fd-muted-foreground'>user-{userId}:</span>
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
	)
}

function Page({ name }: { name: string }) {
	return (
		<cache.Scope path={[name]}>
			<div className='flex flex-col gap-2 rounded-lg border border-fd-border bg-fd-card p-4'>
				<span className='text-xs font-semibold uppercase tracking-wide text-fd-muted-foreground'>{name}</span>
				<userTable.Provider id='user-42'>
					<UserTable userId='42' />
				</userTable.Provider>
			</div>
		</cache.Scope>
	)
}

function Demo() {
	const { clear } = cache.useCache()
	// Pure utility composed with the top-level reactive `useKeys` — re-renders only on membership changes.
	const tree = toTree(cache.useKeys())
	const [showA, setShowA] = useState(true)

	return (
		<div className='flex flex-col gap-4'>
			<p className='text-sm text-fd-muted-foreground'>
				Same <code>user-42</code> table, same store group — mounted under two scopes. Changing one never
				touches the other.
			</p>

			<div className='grid gap-3 sm:grid-cols-2'>
				{showA ? (
					<Page name='page-a' />
				) : (
					<div className='flex items-center justify-center rounded-lg border border-dashed border-fd-border p-4 text-xs text-fd-muted-foreground'>
						page-a left — its store was evicted
					</div>
				)}
				<Page name='page-b' />
			</div>

			<div className='flex flex-col gap-2 rounded-lg border border-dashed border-fd-border p-4'>
				<div className='flex items-center justify-between gap-2'>
					<span className='text-xs font-semibold uppercase tracking-wide text-fd-muted-foreground'>
						cache tree
					</span>
					<button
						type='button'
						onClick={() => {
							if (showA) clear(['page-a'])
							setShowA((on) => !on)
						}}
						className='rounded-md border border-fd-border bg-fd-card px-2 py-0.5 text-xs hover:bg-fd-muted'
					>
						{showA ? `leave page-a → clear(['page-a'])` : `restore page-a`}
					</button>
				</div>
				<pre className='overflow-x-auto text-xs text-fd-foreground'>{JSON.stringify(tree, null, 2)}</pre>
			</div>
		</div>
	)
}

export default function StoreCacheScopeExample() {
	return (
		<cache.Provider>
			<Demo />
		</cache.Provider>
	)
}
