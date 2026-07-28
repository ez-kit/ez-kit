'use client'

import { createStore } from '@ez-kit/valtio-kit'
import { type FieldsBuilder, persist, PersistProvider } from '@ez-kit/valtio-kit/persist'
import { urlField } from '@ez-kit/valtio-kit/persist/url'
import { zodParam } from '@ez-kit/valtio-kit/persist/validators/zod'
import { proxy } from 'valtio'
import { z } from 'zod'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'

type RatingState = {
	// A bounded integer — deep-links outside 1…5 fall back to the default instead of throwing.
	rating: number
}

const ratingSchema = z.coerce.number().int().min(1).max(5)

const fields: FieldsBuilder<RatingState> = (field) => [
	field((s) => s.rating, urlField({ parser: zodParam(ratingSchema) })),
]

const ratingStore = createStore<RatingState>(() => proxy<RatingState>({ rating: 3 }), {
	plugins: [persist({ fields })],
})

const { adapter, useSearch } = createMemoryUrlAdapter()

const STARS = [1, 2, 3, 4, 5]

function RatingControls() {
	const snap = ratingStore.useSnapshot()
	const store = ratingStore.useStore()
	const search = useSearch()

	return (
		<div>
			<div className='flex items-center gap-1'>
				{STARS.map((value) => (
					<button
						key={value}
						type='button'
						onClick={() => {
							store.rating = value
						}}
						aria-label={`Set rating to ${String(value)}`}
						className={`text-2xl leading-none ${value <= snap.rating ? 'text-amber-500' : 'text-fd-muted-foreground/40'}`}
					>
						★
					</button>
				))}
				<span className='ml-2 font-mono text-sm tabular-nums'>{snap.rating}/5</span>
			</div>
			<p className='mt-2 text-xs text-fd-muted-foreground'>
				Try an out-of-range deep link like <code>?rating=99</code> — it is rejected and the default (3) is kept.
			</p>
			<UrlReadout search={search} />
		</div>
	)
}

export default function PersistZodExample() {
	return (
		<PersistProvider adapters={[adapter]}>
			<ratingStore.Provider>
				<RatingControls />
			</ratingStore.Provider>
		</PersistProvider>
	)
}
