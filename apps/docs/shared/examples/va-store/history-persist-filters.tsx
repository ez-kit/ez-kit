'use client'

/* eslint-disable react-hooks/immutability -- valtio proxies are designed to be mutated directly; this demo writes through the raw mutable proxy from useStore() */

import { createContextStore, useHistory, withHistory } from '@ez-kit/va-store'
import { type FieldsBuilder, paramEnum, PersistProvider, useHydrated, withPersist } from '@ez-kit/va-store/persist'
import { urlField } from '@ez-kit/va-store/persist/url'
import { RedoIcon, UndoIcon } from 'lucide-react'
import { useEffect, useId } from 'react'
import { proxy } from 'valtio'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'
import { SegmentedControl } from './history-segmented-control'

const SORTS = ['newest', 'price'] as const
type Sort = (typeof SORTS)[number]

type Filters = {
	q: string
	sort: Sort
}

const fields: FieldsBuilder<Filters> = (field) => [
	field((s) => s.q, urlField()),
	field((s) => s.sort, urlField({ parser: paramEnum(SORTS) })),
]

// History attaches first (it wraps the bare proxy), persist second — the order the Provider replays
// setups in, so history is already listening when persist pushes the hydrated value in.
const filtersStore = createContextStore(() =>
	withPersist(withHistory(proxy<Filters>({ q: '', sort: 'newest' }), { defaultPaused: true }), { fields }),
)

// The example's own in-memory URL, seeded as if the reader arrived on a shared link.
const { adapter, useSearch } = createMemoryUrlAdapter('q=boots&sort=price')

function FilterControls() {
	const queryId = useId()
	const snap = filtersStore.useSnapshot()
	const store = filtersStore.useStore()
	const search = useSearch()

	const hydrated = useHydrated(store)
	const { undo, redo, canUndo, canRedo, pasts, futures } = useHistory(store)

	// Recording starts paused, so hydration from the URL is not an undo step. Resume once it lands.
	useEffect(() => {
		if (hydrated) store.history.resume()
	}, [hydrated, store])

	return (
		<div className='grid gap-4'>
			<div className='flex flex-wrap items-end gap-4'>
				<div className='grid gap-1.5'>
					<Label htmlFor={queryId}>Search</Label>
					<Input
						id={queryId}
						className='w-44'
						value={snap.q}
						placeholder='search…'
						onChange={(event) => {
							store.q = event.target.value
						}}
					/>
				</div>
				<div className='grid gap-1.5'>
					<Label>Sort</Label>
					<SegmentedControl
						options={SORTS}
						value={snap.sort}
						onChange={(sort) => {
							store.sort = sort
						}}
					/>
				</div>
			</div>

			<div className='flex flex-wrap items-center gap-2'>
				<Button
					variant='outline'
					size='sm'
					disabled={!canUndo}
					onClick={undo}
				>
					<UndoIcon />
					Undo
				</Button>
				<Button
					variant='outline'
					size='sm'
					disabled={!canRedo}
					onClick={redo}
				>
					<RedoIcon />
					Redo
				</Button>
				<Badge variant='secondary'>{pasts.length} back</Badge>
				<Badge variant='secondary'>{futures.length} forward</Badge>
				<span className='text-xs text-muted-foreground'>
					{hydrated ? 'hydrated — recording' : 'hydrating — recording paused'}
				</span>
			</div>

			<UrlReadout search={search} />
		</div>
	)
}

export default function HistoryPersistFiltersExample() {
	return (
		<PersistProvider adapters={[adapter]}>
			<filtersStore.Provider>
				<FilterControls />
			</filtersStore.Provider>
		</PersistProvider>
	)
}
