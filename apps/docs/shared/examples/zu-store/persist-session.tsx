'use client'

import { StoreProvider } from '@ez-kit/zu-store'
import { sessionStorageAdapter } from '@ez-kit/zu-store/persist/storage'

import { PreferenceControls } from './persist-storage/controls'
import { prefs } from './persist-storage/store'

const sources = { browser: sessionStorageAdapter({ storageKey: 'ez-kit-guide-zu-store-session' }) }

export default function PreferencesExample() {
	return (
		<StoreProvider
			persist={sources}
			defaultSource='browser'
		>
			<prefs.Provider>
				<PreferenceControls />
			</prefs.Provider>
		</StoreProvider>
	)
}
