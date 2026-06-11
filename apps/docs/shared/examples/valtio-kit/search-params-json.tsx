'use client'

import {
	createSearchParamsStore,
	json,
	paramBoolean,
	paramEnum,
	paramString,
	StoreSearchParamsProvider,
} from '@ez-kit/valtio-kit/search-params'
import { proxy } from 'valtio'

import { createMemoryAdapter, UrlReadout } from './_memory-adapter'

type View = 'grid' | 'list'

type SettingsState = {
	view: View
	q: string
	compact: boolean
	setView: (view: View) => void
	setQ: (value: string) => void
	toggleCompact: (next: boolean) => void
}

const settingsStore = createSearchParamsStore<SettingsState>(
	() => {
		const state = proxy<SettingsState>({
			view: 'grid',
			q: '',
			compact: false,
			setView: (view) => {
				state.view = view
			},
			setQ: (value) => {
				state.q = value
			},
			toggleCompact: (next) => {
				state.compact = next
			},
		})
		return state
	},
	{
		// Every field is packed into one canonical-JSON param so a single key carries the whole state.
		fields: (field) => [
			field((s) => s.view, paramEnum<View>(['grid', 'list'])),
			field((s) => s.q, paramString()),
			field((s) => s.compact, paramBoolean()),
		],
		layout: json('state'),
	},
)

const { adapter, useSearch } = createMemoryAdapter()

function SettingsControls() {
	const snap = settingsStore.useSnapshot()
	const search = useSearch()

	return (
		<div>
			<div className='flex flex-wrap items-center gap-3'>
				<div className='inline-flex overflow-hidden rounded-md border border-fd-border'>
					{(['grid', 'list'] as const).map((view) => (
						<button
							key={view}
							type='button'
							onClick={() => {
								snap.setView(view)
							}}
							className={`px-3 py-1 text-sm font-medium ${
								snap.view === view ? 'bg-fd-primary text-fd-primary-foreground' : 'bg-fd-card hover:bg-fd-muted'
							}`}
						>
							{view}
						</button>
					))}
				</div>
				<label className='flex items-center gap-2 text-sm'>
					<input
						type='checkbox'
						checked={snap.compact}
						onChange={(event) => {
							snap.toggleCompact(event.target.checked)
						}}
					/>
					<span>compact</span>
				</label>
				<input
					value={snap.q}
					onChange={(event) => {
						snap.setQ(event.target.value)
					}}
					placeholder='search…'
					className='w-40 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm'
				/>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function SearchParamsJsonExample() {
	return (
		<StoreSearchParamsProvider adapter={adapter}>
			<settingsStore.Provider>
				<SettingsControls />
			</settingsStore.Provider>
		</StoreSearchParamsProvider>
	)
}
