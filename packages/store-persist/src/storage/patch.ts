import { deserializePersistAddress, isWithinScope } from '@ez-kit/store-core'

import { decodeRecord, FutureVersionError } from '../record'

import type { CommitCtx, Keyed } from '../types'

/** Check before mutating, so a rejected patch never partially commits. */
export function patchKeyed(current: Keyed, desired: Keyed, context: CommitCtx): Keyed {
	const blocked: string[] = []
	for (const key of [...context.diff.set, ...context.diff.removed]) {
		if (context.explicitReset && context.diff.removed.includes(key)) continue
		const maximum = context.maxVersions?.get(key)
		const raw = current.get(key)
		if (maximum === undefined || raw === undefined) continue
		try {
			if (decodeRecord(raw).version > maximum) blocked.push(key)
		} catch {
			/* A damaged value can be replaced. */
		}
	}
	if (blocked.length) throw new FutureVersionError(blocked)
	const next = new Map(current)
	for (const key of context.diff.set) {
		const value = desired.get(key)
		if (value !== undefined) next.set(key, value)
	}
	for (const key of context.diff.removed) next.delete(key)
	return next
}

export function removeKeyedScope(current: Keyed, path: readonly string[]): Keyed {
	return new Map(
		[...current].filter(([key]) => {
			const address = deserializePersistAddress(key)
			return !address || !isWithinScope(address.store.path, path)
		}),
	)
}
