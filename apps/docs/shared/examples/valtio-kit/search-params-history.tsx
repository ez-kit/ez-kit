'use client'

import {
	createSearchParamsStore,
	paramString,
	StoreSearchParamsProvider,
} from '@ez-kit/valtio-kit/search-params'
import { proxy } from 'valtio'

import { createMemoryAdapter, UrlReadout } from './_memory-adapter'

const STEPS = ['account', 'profile', 'review'] as const

type WizardState = {
	step: string
	next: () => void
	back: () => void
}

const wizardStore = createSearchParamsStore<WizardState>(
	() => {
		const state = proxy<WizardState>({
			step: 'account',
			next: () => {
				const index = STEPS.indexOf(state.step as (typeof STEPS)[number])
				const target = STEPS[index + 1]
				if (target) {
					state.step = target
				}
			},
			back: () => {
				const index = STEPS.indexOf(state.step as (typeof STEPS)[number])
				const target = STEPS[index - 1]
				if (target) {
					state.step = target
				}
			},
		})
		return state
	},
	{
		fields: { step: paramString() },
		// Default writes replace; the control lets a specific mutation opt into a push instead.
		history: 'replace',
	},
)

const { adapter, useSearch } = createMemoryAdapter('step=account')

function WizardControls() {
	const snap = wizardStore.useSnapshot()
	const store = wizardStore.useStore()
	const search = useSearch()
	const index = STEPS.indexOf(snap.step as (typeof STEPS)[number])

	return (
		<div>
			<p className='mb-3 text-sm text-fd-muted-foreground'>
				Current step: <span className='font-mono text-fd-foreground'>{snap.step}</span>
			</p>
			<div className='flex flex-wrap gap-2'>
				<button
					type='button'
					disabled={index <= 0}
					// replace: going back shouldn't stack history entries.
					onClick={() => {
						store.$searchParams.replace(snap.back)
					}}
					className='rounded-md border border-fd-border bg-fd-card px-3 py-1 text-sm font-medium hover:bg-fd-muted disabled:opacity-40'
				>
					← back (replace)
				</button>
				<button
					type='button'
					disabled={index >= STEPS.length - 1}
					// push: advancing creates a back-button-able entry.
					onClick={() => {
						store.$searchParams.push(snap.next)
					}}
					className='rounded-md border border-fd-border bg-fd-primary px-3 py-1 text-sm font-medium text-fd-primary-foreground hover:opacity-90 disabled:opacity-40'
				>
					next (push) →
				</button>
			</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function SearchParamsHistoryExample() {
	return (
		<StoreSearchParamsProvider adapter={adapter}>
			<wizardStore.Provider>
				<WizardControls />
			</wizardStore.Provider>
		</StoreSearchParamsProvider>
	)
}
