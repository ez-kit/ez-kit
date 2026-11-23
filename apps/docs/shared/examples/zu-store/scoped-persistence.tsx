'use client'

import { StoreProvider } from '@ez-kit/zu-store'
import { localStorageAdapter } from '@ez-kit/zu-store/persist/storage'

import { Controls, LayoutPanel } from './scoped-persistence/controls'
import { serverPort } from './scoped-persistence/server'
import { browserPanel, cache, scope, serverPanel } from './scoped-persistence/store'

const adapters = {
	browser: localStorageAdapter({ storageKey: 'ez-kit-docs-scoped-layouts-v2' }),
	server: { port: serverPort },
}

export default function ScopedPersistenceExample() {
	return (
		<StoreProvider
			persist={adapters}
			cache={cache}
			defaultSource='browser'
		>
			<cache.Scope path={scope}>
				<div className='space-y-4'>
					<Controls />
					<browserPanel.Provider id='workspace'>
						<LayoutPanel
							group={browserPanel}
							label='Browser'
						/>
					</browserPanel.Provider>
					<serverPanel.Provider id='workspace'>
						<LayoutPanel
							group={serverPanel}
							label='Server'
						/>
					</serverPanel.Provider>
				</div>
			</cache.Scope>
		</StoreProvider>
	)
}
