import { localStorageAdapter } from '@ez-kit/va-store/persist/storage'

import type { SourcePort } from '@ez-kit/va-store/persist'

export function createDemoSource() {
	const { port: storage } = localStorageAdapter({ storageKey: 'ez-kit-guide-va-store-server' })
	let delayNextRead = false
	let failWrites = false
	const port: SourcePort = {
		...storage,
		async get(context) {
			const snapshot = await storage.get(context)
			if (delayNextRead) {
				delayNextRead = false
				await new Promise<void>((resolve) => setTimeout(resolve, 2500))
			}
			return snapshot
		},
		async set(values, context) {
			if (failWrites) throw new Error('Server rejected the write')
			await storage.set(values, context)
		},
	}
	return {
		adapter: { port },
		delayRead: () => {
			delayNextRead = true
		},
		setFailWrites: (value: boolean) => {
			failWrites = value
		},
	}
}
