import { decodeRecord, encodeRecord, serializePersistAddress } from '@ez-kit/zu-store/persist'
import { patchKeyed, removeKeyedScope } from '@ez-kit/zu-store/persist/storage'

import { scope } from './store'

import type { CommitCtx, Keyed, SourcePort } from '@ez-kit/zu-store/persist'

const serverKey = serializePersistAddress({
	store: { path: scope, name: 'server-panel', id: 'workspace' },
	field: ['width'],
})
let serverValues: Keyed = new Map([[serverKey, encodeRecord('720')]])
const deliveries = new Set<() => void>()
const readoutListeners = new Set<() => void>()
const emitReadout = (): void => {
	for (const listener of readoutListeners) listener()
}

// Deliberately cannot abort: the demo lets the reader deliver an obsolete response after timeout.
export const serverPort: SourcePort = {
	capabilities: { recordVersions: true },
	get() {
		const snapshot = new Map(serverValues)
		return new Promise<Keyed>((resolve) => {
			const deliver = (): void => {
				deliveries.delete(deliver)
				resolve(snapshot)
			}
			deliveries.add(deliver)
		})
	},
	async set(desired: Keyed, context: CommitCtx) {
		await Promise.resolve()
		serverValues = patchKeyed(serverValues, desired, context)
		emitReadout()
	},
	async removeScope(path) {
		await Promise.resolve()
		serverValues = removeKeyedScope(serverValues, path)
		emitReadout()
	},
}

export const subscribeReadout = (listener: () => void): (() => void) => {
	readoutListeners.add(listener)
	return () => {
		readoutListeners.delete(listener)
	}
}
export const readSavedWidth = (): string => {
	const raw = serverValues.get(serverKey)
	return raw === undefined ? 'default' : decodeRecord(raw).value
}

export function deliverServerRead() {
	for (const deliver of [...deliveries]) deliver()
}
