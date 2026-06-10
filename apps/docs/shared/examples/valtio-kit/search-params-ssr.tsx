'use client'

import {
	createSearchParamsStore,
	paramEnum,
	StoreSearchParamsProvider,
} from '@ez-kit/valtio-kit/search-params'
import { proxy } from 'valtio'

import { createMemoryAdapter, UrlReadout } from './_memory-adapter'

type Tab = 'overview' | 'billing' | 'team'

type TabsState = {
	tab: Tab
	setTab: (tab: Tab) => void
}

// Request-scoped store: the proxy is created per <Provider> and seeded synchronously from the
// URL on both server and client, so the first paint already reflects ?tab=… with no flash and
// no hydration mismatch. In a Next.js app, render <StoreSearchParamsProvider adapter={nextAdapter}>.
const tabsStore = createSearchParamsStore<TabsState>(
	() => {
		const state = proxy<TabsState>({
			tab: 'overview',
			setTab: (tab) => {
				state.tab = tab
			},
		})
		return state
	},
	{ fields: { tab: paramEnum<Tab>(['overview', 'billing', 'team']) } },
)

const TABS: Tab[] = ['overview', 'billing', 'team']

// Seeded with a deep link to demonstrate the synchronous seed: the store opens on "billing".
const { adapter, useSearch } = createMemoryAdapter('tab=billing')

function Tabs() {
	const snap = tabsStore.useSnapshot()
	const search = useSearch()

	return (
		<div>
			<div role='tablist' className='flex gap-1 border-b border-fd-border'>
				{TABS.map((tab) => (
					<button
						key={tab}
						type='button'
						role='tab'
						aria-selected={snap.tab === tab}
						onClick={() => {
							snap.setTab(tab)
						}}
						className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium capitalize ${
							snap.tab === tab
								? 'border-fd-primary text-fd-foreground'
								: 'border-transparent text-fd-muted-foreground hover:text-fd-foreground'
						}`}
					>
						{tab}
					</button>
				))}
			</div>
			<div className='py-4 text-sm capitalize'>{snap.tab} content</div>
			<UrlReadout search={search} />
		</div>
	)
}

export default function SearchParamsSsrExample() {
	return (
		<StoreSearchParamsProvider adapter={adapter}>
			<tabsStore.Provider>
				<Tabs />
			</tabsStore.Provider>
		</StoreSearchParamsProvider>
	)
}
