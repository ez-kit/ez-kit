'use client'

import { createContextStore, pipe, StoreProvider } from '@ez-kit/zu-store'
import { type FieldsBuilder, withPersist } from '@ez-kit/zu-store/persist'
import { urlField } from '@ez-kit/zu-store/persist/url'
import { zodParam } from '@ez-kit/zu-store/persist/validators/zod'
import { StarIcon } from 'lucide-react'
import { z } from 'zod'
import { createStore } from 'zustand/vanilla'

import { Button } from '@/components/ui/button'

import { createMemoryUrlAdapter, UrlReadout } from './_memory-adapter'

type RatingState = {
	// A bounded integer — deep-links outside 1…5 fall back to the default instead of throwing.
	rating: number
	rate: (rating: number) => void
}

const ratingSchema = z.coerce.number().int().min(1).max(5)

const fields: FieldsBuilder<RatingState> = (field) => [
	field((state) => state.rating, urlField({ parser: zodParam(ratingSchema) })),
]

const ratingStore = createContextStore(() =>
	pipe(
		createStore<RatingState>()((set) => ({
			rating: 3,
			rate: (rating) => {
				set({ rating })
			},
		})),
		withPersist({ fields }),
	),
)

const { adapter, useSearch } = createMemoryUrlAdapter()

const STARS = [1, 2, 3, 4, 5]

function RatingControls() {
	const rating = ratingStore.useSelector((state) => state.rating)
	const rate = ratingStore.useSelector((state) => state.rate)
	const search = useSearch()

	return (
		<div>
			<div className='flex items-center gap-1'>
				{STARS.map((value) => (
					<Button
						key={value}
						variant='ghost'
						size='icon-sm'
						aria-label={`Set rating to ${String(value)}`}
						onClick={() => {
							rate(value)
						}}
					>
						<StarIcon className={value <= rating ? 'fill-current' : 'text-muted-foreground'} />
					</Button>
				))}
				<span className='ml-2 font-mono text-sm tabular-nums'>{rating}/5</span>
			</div>
			<p className='mt-2 text-xs text-muted-foreground'>
				Try an out-of-range deep link like <code>?rating=99</code> — it is rejected and the default (3) is kept.
			</p>
			<UrlReadout search={search} />
		</div>
	)
}

export default function PersistZodExample() {
	return (
		<StoreProvider persist={[adapter]}>
			<ratingStore.Provider>
				<RatingControls />
			</ratingStore.Provider>
		</StoreProvider>
	)
}
