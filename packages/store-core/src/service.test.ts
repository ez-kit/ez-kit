import { describe, expect, expectTypeOf, it } from 'vitest'

import { createServiceRegistry, extendServiceRegistry, serviceKey } from './service'

import type { PluginContext } from './plugin'

type Engines = { get(source: string): string }

const ENGINES = serviceKey<Engines>('persist.engines')

describe('service registry', () => {
	it('throws a named error from get when the service is not mounted', () => {
		const registry = createServiceRegistry()
		expect(() => registry.get(ENGINES)).toThrowError('persist.engines')
	})

	it('returns undefined from safeGet when the service is not mounted', () => {
		const registry = createServiceRegistry()
		expect(registry.safeGet(ENGINES)).toBeUndefined()
	})

	it('resolves a mounted service through get and safeGet', () => {
		const engines: Engines = { get: (source) => source }
		const registry = createServiceRegistry([[ENGINES, engines]])
		expect(registry.get(ENGINES)).toBe(engines)
		expect(registry.safeGet(ENGINES)).toBe(engines)
	})

	it('carries the service value type without a manual cast', () => {
		const engines: Engines = { get: (source) => source }
		const registry = createServiceRegistry([[ENGINES, engines]])
		const resolved = registry.get(ENGINES)
		expectTypeOf(resolved).toEqualTypeOf<Engines>()
	})

	it('treats two keys with the same id as the same slot', () => {
		const engines: Engines = { get: (source) => source }
		const sameSlot = serviceKey<Engines>('persist.engines')
		const registry = createServiceRegistry([[ENGINES, engines]])
		expect(registry.get(sameSlot)).toBe(engines)
	})
})

describe('extendServiceRegistry', () => {
	it('merges new entries over a base without mutating the base', () => {
		const base = createServiceRegistry([[ENGINES, { get: () => 'base' }]])
		const extended = extendServiceRegistry(base, [[ENGINES, { get: () => 'override' }]])
		expect(extended.get(ENGINES).get('x')).toBe('override')
		expect(base.get(ENGINES).get('x')).toBe('base')
	})

	it('falls through to the base for keys only the base exposes', () => {
		const OTHER = serviceKey<string>('other')
		const base = createServiceRegistry([[OTHER, 'kept']])
		const extended = extendServiceRegistry(base, [[ENGINES, { get: () => 'new' }]])
		expect(extended.get(OTHER)).toBe('kept')
		expect(extended.get(ENGINES).get('x')).toBe('new')
	})

	it('builds a registry from no base', () => {
		const extended = extendServiceRegistry(undefined, [[ENGINES, { get: () => 'only' }]])
		expect(extended.get(ENGINES).get('x')).toBe('only')
	})
})

describe('plugin context shape', () => {
	it('exposes services, id, and isServer', () => {
		const ctx: PluginContext = {
			services: createServiceRegistry(),
			id: { path: ['a'], name: 'group', id: '1' },
			isServer: false,
		}
		expect(ctx.id.path).toEqual(['a'])
		expect(ctx.isServer).toBe(false)
		expectTypeOf(ctx.services.safeGet(ENGINES)).toEqualTypeOf<Engines | undefined>()
	})
})
