'use client'

import { type ContextStoreInit, createStoreCache, toTree } from '@ez-kit/zu-store'
import { useState } from 'react'
import { createStore } from 'zustand/vanilla'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyDescription } from '@/components/ui/empty'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type TableState = {
	filter: string
	setFilter: (filter: string) => void
}

const cache = createStoreCache()

// One store group, defined once.
const userTable = cache.createCachedStore(
	({ defaultValue }: ContextStoreInit<{ filter?: string }>) =>
		createStore<TableState>((set) => ({
			filter: defaultValue.filter ?? 'all',
			setFilter: (filter) => {
				set({ filter })
			},
		})),
	{ name: 'user-table' },
)

const FILTERS = ['all', 'active', 'archived']

// Reusable table: it knows ONLY its own id, nothing about where it is mounted.
// The enclosing <cache.Scope> decides its namespace, so two mounts never collide.
function UserTable({ userId }: { userId: string }) {
	const filter = userTable.useSelector((s) => s.filter)
	const setFilter = userTable.useSelector((s) => s.setFilter)

	return (
		<div className='flex flex-wrap items-center gap-3'>
			<Badge variant='secondary'>user-{userId}</Badge>
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
	)
}

function Page({ name }: { name: string }) {
	return (
		<cache.Scope path={[name]}>
			<Card
				size='sm'
				className='gap-3 px-4'
			>
				<Badge variant='outline'>{name}</Badge>
				<userTable.Provider id='user-42'>
					<UserTable userId='42' />
				</userTable.Provider>
			</Card>
		</cache.Scope>
	)
}

function Demo() {
	const { clear } = cache.useCache()
	// Pure utility composed with the reactive `useCacheKeys` — re-renders only on membership changes.
	const tree = toTree(cache.useCacheKeys())
	const [showA, setShowA] = useState(true)

	return (
		<div className='flex flex-col gap-4'>
			<p className='text-sm text-muted-foreground'>
				Same <code>user-42</code> table, same store group — mounted under two scopes. Changing one never touches the
				other.
			</p>

			<div className='grid gap-3 sm:grid-cols-2'>
				{showA ? (
					<Page name='page-a' />
				) : (
					<Empty className='border'>
						<EmptyDescription>page-a left — its store was evicted</EmptyDescription>
					</Empty>
				)}
				<Page name='page-b' />
			</div>

			<Card
				size='sm'
				className='gap-2 px-4'
			>
				<div className='flex items-center justify-between gap-2'>
					<Badge variant='outline'>cache tree</Badge>
					<Button
						variant='outline'
						size='xs'
						onClick={() => {
							if (showA) clear(['page-a'])
							setShowA((on) => !on)
						}}
					>
						{showA ? `leave page-a → clear(['page-a'])` : `restore page-a`}
					</Button>
				</div>
				<pre className='overflow-x-auto text-xs'>{JSON.stringify(tree, null, 2)}</pre>
			</Card>
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
