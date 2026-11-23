import { describe, expect, it } from 'vitest'

import type { NamedPersistAdapter as VaAdapter, ReadCtx as VaReadCtx } from '@ez-kit/va-store/persist'
import type { CommitCtx, NamedPersistAdapter, ReadCtx, SourcePort, SyncSourcePort } from '@ez-kit/zu-store/persist'

// Compile against the consumer entries, including both adapter lifetimes and the shared context.
const get = (context?: ReadCtx): Map<string, string> => {
	const compatible: VaReadCtx | undefined = context
	return new Map(compatible?.addresses.size ? [['logical', 'value']] : [])
}
const set = (_values: Map<string, string>, context: CommitCtx): void => {
	void context.diff
}
const sync: SyncSourcePort = { get, set }
const asyncPort: SourcePort = {
	get: async (context) => {
		await Promise.resolve()
		return get(context)
	},
	set,
	capabilities: { recordVersions: true },
	removeScope: async (path) => {
		await Promise.resolve()
		void path
	},
}
const ambient = { port: asyncPort } satisfies NamedPersistAdapter
const renderScoped = { usePort: () => ({ port: sync, changeKey: 'query' }) } satisfies NamedPersistAdapter
const both: readonly VaAdapter[] = [ambient, renderScoped]

describe('public adapter types', () => {
	it('shares custom adapter contracts through both bindings', () => {
		expect(both).toHaveLength(2)
	})
})
