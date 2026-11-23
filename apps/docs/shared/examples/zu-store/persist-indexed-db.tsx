'use client'

import { StoreProvider } from '@ez-kit/zu-store'
import { indexedDbAdapter } from '@ez-kit/zu-store/persist/storage'

import { PreferenceControls } from './persist-storage/controls'
import { prefs } from './persist-storage/store'

const sources = { browser: indexedDbAdapter({ dbName: 'ez-kit-guide-zu-store' }) }

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
