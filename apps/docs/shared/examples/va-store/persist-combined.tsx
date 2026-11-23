'use client'

import { StoreProvider } from '@ez-kit/va-store'
import { localStorageAdapter } from '@ez-kit/va-store/persist/storage'

import { ListControls } from './persist-combined/controls'
import { listStore, url } from './persist-combined/store'

const sources = [url.adapter, localStorageAdapter({ storageKey: 'ez-kit-guide-va-store-combined' })]

export default function PersistCombinedExample() {
	return (
		<StoreProvider persist={sources}>
			<listStore.Provider>
				<ListControls />
			</listStore.Provider>
		</StoreProvider>
	)
}
