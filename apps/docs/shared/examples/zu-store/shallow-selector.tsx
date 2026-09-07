'use client'

import { createContextStore } from '@ez-kit/zu-store'
import { PlusIcon } from 'lucide-react'
import { useId } from 'react'
import { createStore } from 'zustand/vanilla'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

type Sort = 'newest' | 'oldest'

type ListState = {
	search: string
	sort: Sort
	/** Not part of the selection below — its updates must not reach the panel. */
	ignored: number
	setSearch: (search: string) => void
	setSort: (sort: Sort) => void
	bumpIgnored: () => void
}

const listStore = createContextStore(() =>
	createStore<ListState>()((set, get) => ({
		search: '',
		sort: 'newest',
		ignored: 0,
		setSearch: (search) => {
			set({ search })
		},
		setSort: (sort) => {
			set({ sort })
		},
		bumpIgnored: () => {
			set({ ignored: get().ignored + 1 })
		},
	})),
)

function QueryPanel() {
	const searchId = useId()
	const sortId = useId()
	// One selection covering both fields. The object is rebuilt on every run, so this
	// MUST be useShallowSelector — the same selector through useSelector loops on mount.
	const { search, sort } = listStore.useShallowSelector((s) => ({ search: s.search, sort: s.sort }))
	const setSearch = listStore.useSelector((s) => s.setSearch)
	const setSort = listStore.useSelector((s) => s.setSort)

	return (
		<Card
			size='sm'
			className='gap-3 px-4'
		>
			<Badge variant='outline'>one shallow selection</Badge>

			<div className='flex flex-wrap items-center gap-4'>
				<div className='flex items-center gap-2'>
					<Label htmlFor={searchId}>search</Label>
					<Input
						id={searchId}
						className='w-40'
						value={search}
						placeholder='type here…'
						onChange={(event) => {
							setSearch(event.target.value)
						}}
					/>
				</div>
				<div className='flex items-center gap-2'>
					<Label htmlFor={sortId}>sort</Label>
					<NativeSelect
						id={sortId}
						size='sm'
						value={sort}
						onChange={(event) => {
							setSort(event.target.value as Sort)
						}}
					>
						<NativeSelectOption value='newest'>newest</NativeSelectOption>
						<NativeSelectOption value='oldest'>oldest</NativeSelectOption>
					</NativeSelect>
				</div>
			</div>

			<pre className='overflow-x-auto text-xs'>{JSON.stringify({ search, sort }, null, 2)}</pre>
		</Card>
	)
}

function QuerySummary() {
	// The same selection through the render-prop form. `shallow` is what makes the object
	// literal legal here — without it this selector loops exactly as useSelector would.
	return (
		<listStore.Subscribe
			selector={(s) => ({ search: s.search, sort: s.sort })}
			shallow
		>
			{({ search, sort }) => (
				<div className='flex items-center gap-2'>
					<Label className='text-muted-foreground'>via Subscribe</Label>
					<Badge variant='secondary'>{`${search || '—'} · ${sort}`}</Badge>
				</div>
			)}
		</listStore.Subscribe>
	)
}

function IgnoredField() {
	const ignored = listStore.useSelector((s) => s.ignored)
	const bumpIgnored = listStore.useSelector((s) => s.bumpIgnored)

	return (
		<div className='flex items-center gap-3'>
			<Label className='text-muted-foreground'>ignored by the selection above</Label>
			<output className='min-w-[3ch] text-center font-mono tabular-nums'>{ignored}</output>
			<Button
				variant='outline'
				size='icon-sm'
				aria-label='Bump the ignored counter'
				onClick={bumpIgnored}
			>
				<PlusIcon />
			</Button>
		</div>
	)
}

export default function ShallowSelectorExample() {
	return (
		<listStore.Provider>
			<div className='flex flex-col gap-4'>
				<QueryPanel />
				<QuerySummary />
				<IgnoredField />
				<p className='text-xs text-muted-foreground'>
					<code>ignored</code> lives in the same store, so every bump notifies every subscriber. Shallow equality is
					what stops the panel above from re-rendering: its selection comes back with the same two entries, so there is
					no change to apply.
				</p>
			</div>
		</listStore.Provider>
	)
}
