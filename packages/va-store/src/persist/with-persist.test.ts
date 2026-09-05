import { capabilitiesOf } from '@ez-kit/store-core'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { paramString } from './codecs'
import { persistHandle, PERSIST_HANDLE, urlHandle, URL_HANDLE } from './handle'
import { withPersist } from './with-persist'

import type { PersistPluginOptions } from './plugin'

/** A store with a URL field and no storage field — so `$persist` is the unbacked slot. */
const urlField: PersistPluginOptions<{ q: string }> = {
	fields: (field) => [field((state) => state.q, { source: 'url', parser: paramString() })],
}

describe('withPersist', () => {
	it('returns the same proxy identity', () => {
		const state = proxy({ q: '' })
		expect(withPersist(state, {})).toBe(state)
	})

	it('registers exactly one persist capability', () => {
		const state = withPersist(proxy({ q: '' }), {})
		expect(capabilitiesOf(state).map((plugin) => plugin.name)).toEqual(['persist'])
	})

	it('keeps the proxy free of extra enumerable keys', () => {
		const state = withPersist(proxy({ q: '' }), {})
		expect(Object.keys(state)).toEqual(['q'])
	})

	it('attaches both control handles in the factory phase, before any Provider mounts', () => {
		const state = withPersist(proxy({ q: '' }), {})

		// Typed off the return value rather than via `urlHandle()` — that is the point of the widening.
		expect(typeof state.$url.runWithMeta).toBe('function')
		expect(typeof state.$persist.runWithMeta).toBe('function')
	})

	it('names the source of a backed slot and leaves an unbacked one null', () => {
		const state = withPersist(proxy({ q: '' }), urlField)

		expect(state.$url.source).toBe('url')
		// No storage field is declared, so `$persist` exists only to keep the return type true.
		expect(state.$persist.source).toBeNull()
	})

	it('runs the mutation of an unbacked, unconnected handle instead of dropping it', () => {
		const state = withPersist(proxy({ q: '' }), urlField)

		state.$persist.runWithMeta({}, () => {
			state.q = 'typed'
		})

		expect(state.q).toBe('typed')
	})

	it('resolves an unbacked slot through the accessors instead of throwing', () => {
		// The accessors used to throw "no $persist handle on this proxy" for a store that declared no
		// storage field. Both slots now exist so the widened return type is true, so the throw is gone
		// for anything that went through `withPersist` — the handle is simply inert.
		const state = withPersist(proxy({ q: '' }), urlField)

		expect(urlHandle(state).source).toBe('url')
		expect(persistHandle(state).source).toBeNull()
	})

	it('still throws for a proxy that never went through withPersist', () => {
		// What the accessors' error means now: not "no field for that source", but "this proxy was
		// never persisted at all".
		const bare = proxy({ q: '' })

		expect(() => urlHandle(bare)).toThrow(/no "\$url" handle/)
		expect(() => persistHandle(bare)).toThrow(/no "\$persist" handle/)
	})

	it('keeps both handles non-enumerable, so they stay out of snapshots and JSON', () => {
		const state = withPersist(proxy({ q: '' }), urlField)

		expect(Object.keys(state)).toEqual(['q'])
		expect(Object.prototype.propertyIsEnumerable.call(state, URL_HANDLE)).toBe(false)
		expect(Object.prototype.propertyIsEnumerable.call(state, PERSIST_HANDLE)).toBe(false)
		expect(JSON.stringify(state)).toBe('{"q":""}')
	})
})
