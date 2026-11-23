'use client'

import { StoreProvider } from '@ez-kit/zu-store'
import { localStorageAdapter } from '@ez-kit/zu-store/persist/storage'

import { ListControls } from './persist-combined/controls'
import { listStore, url } from './persist-combined/store'

const sources = [url.adapter, localStorageAdapter({ storageKey: 'ez-kit-guide-zu-store-combined' })]

export default function PersistCombinedExample() {
	return (
		<StoreProvider persist={sources}>
			<listStore.Provider>
				<ListControls />
			</listStore.Provider>
		</StoreProvider>
	)
}
