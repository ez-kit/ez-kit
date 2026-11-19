import { createServiceRegistry, serializePersistAddress } from '@ez-kit/store-core'
import { useCapabilities, useServices } from '@ez-kit/store-core/react'
import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createPersistEngine } from './engine'
import { persistHandle } from './handle'
import { persist } from './plugin'
import { PersistProvider } from './provider'
import { createPersistEngines, PERSIST_ENGINES } from './service'
import { objectPort, observable } from './test-kit'
import { createUrlPort } from './url/adapter'
import { applyPersist } from './with-persist'

import type { PersistPluginOptions } from './plugin'

const id = { path: [], name: 'panel', id: 'one' }

function Mount({ store }: { store: object }) {
	useCapabilities(store, useServices(), id)
	return null
}

function sharedSources(second?: string) {
	const store = observable({ q: '' })
	applyPersist<typeof store, typeof store>(store, objectPort, {
		fields: (field) => [field((state) => state.q, { source: 'url' }), field((state) => state.q, { source: 'browser' })],
	})
	const url = createUrlPort({ read: () => new URLSearchParams('q=first'), commit: () => undefined })
	const key = serializePersistAddress({ store: id, field: ['q'] })
	const browser = { get: () => new Map(second === undefined ? [] : [[key, second]]), set: vi.fn() }
	const adapters = {
		url: { usePort: () => ({ port: url, changeKey: '' }) },
		browser: { port: browser },
	}
	return { store, adapters }
}

describe('source binding setup ownership', () => {
	it('captures every default before render seeding so the first present source wins', () => {
		const { store, adapters } = sharedSources('second')
		render(
			<PersistProvider adapters={adapters}>
				<Mount store={store} />
			</PersistProvider>,
		)
		expect(store.q).toBe('first')
	})

	it('resets a later source to the factory default rather than an earlier hydrated value', async () => {
		const { store, adapters } = sharedSources()
		render(
			<PersistProvider adapters={adapters}>
				<Mount store={store} />
			</PersistProvider>,
		)
		expect(store.q).toBe('first')
		await act(async () => {
			await persistHandle(store, 'browser').reset()
		})
		expect(store.q).toBe('')
	})

	it('disconnects earlier sources when a later connection fails and leaves no ghost writer', async () => {
		const set = vi.fn()
		const first = createPersistEngine({ get: () => new Map(), set }, { source: 'first' })
		const second = createPersistEngine({ get: () => new Map(), set: () => undefined }, { source: 'second' })
		const services = createServiceRegistry([
			[
				PERSIST_ENGINES,
				createPersistEngines(
					new Map([
						['first', first],
						['second', second],
					]),
				),
			],
		])
		const context = { services, id, isServer: false }
		const occupying = observable({ q: '' })
		const occupyingPlugin = persist<object, typeof occupying>(objectPort, {
			fields: (field) => [field((state) => state.q, { source: 'second' })],
		})
		const disconnect = occupyingPlugin.setup(occupying, context)
		const failed = observable({ p: '', q: '' })
		const options: PersistPluginOptions<typeof failed> = {
			fields: (field) => [
				field((state) => state.p, { source: 'first' }),
				field((state) => state.q, { source: 'second' }),
			],
		}
		try {
			expect(() => persist(objectPort, options).setup(failed, context)).toThrow(/collision/)
			failed.p = 'ghost'
			await first.flush()
			expect(set).not.toHaveBeenCalled()
		} finally {
			disconnect?.()
			first.dispose()
			second.dispose()
		}
	})
})
