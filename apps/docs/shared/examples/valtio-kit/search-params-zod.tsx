'use client'

import {
	createSearchParamsStore,
	StoreSearchParamsProvider,
} from '@ez-kit/valtio-kit/search-params'
import { zodParam } from '@ez-kit/valtio-kit/search-params/validators/zod'
import { proxy } from 'valtio'
import { z } from 'zod'

import { createMemoryAdapter, UrlReadout } from './_memory-adapter'

type RatingState = {
	// A bounded integer — deep-links outside 1…5 fall back to the default instead of throwing.
	rating: number
	setRating: (value: number) => void
}

const ratingSchema = z.coerce.number().int().min(1).max(5)

const rangeStore = createSearchParamsStore<RatingState>(
	() => {
		const state = proxy<RatingState>({
			rating: 3,
			setRating: (value) => {
				state.rating = value
			},
		})
		return state
	},
	{ fields: { rating: zodParam(ratingSchema) } },
)

const { adapter, useSearch } = createMemoryAdapter()

const STARS = [1, 2, 3, 4, 5]

function RatingControls() {
	const snap = rangeStore.useSnapshot()
	const search = useSearch()

	return (
		<div>
			<div className='flex items-center gap-1'>
				{STARS.map((value) => (
					<button
						key={value}
						type='button'
						onClick={() => {
							snap.setRating(value)
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

export default function SearchParamsZodExample() {
	return (
		<StoreSearchParamsProvider adapter={adapter}>
			<rangeStore.Provider>
				<RatingControls />
			</rangeStore.Provider>
		</StoreSearchParamsProvider>
	)
}
