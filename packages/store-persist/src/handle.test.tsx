import { useCapabilities, useServices } from '@ez-kit/store-core/react'
import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { persistHandle, urlHandle } from './handle'
import { PersistProvider } from './provider'
import { objectPort, observable } from './test-kit'
import { applyPersist } from './with-persist'

function Mount({ store }: { store: object }) {
	useCapabilities(store, useServices(), { path: [], name: 'handle', id: 'singleton' })
	return null
}
function memoryPort() {
	return { get: () => new Map<string, string>(), set: vi.fn() }
}

describe('persistence source handles', () => {
	it('separates explicit $persist/$url source names from both shorthand handles', async () => {
		const value = observable({ first: 0, persisted: 0, linked: 0, query: '' })
		applyPersist<typeof value, typeof value>(value, objectPort, {
			fields: (field) => [
				field((s) => s.first, { source: 'first' }),
				field((s) => s.persisted, { source: '$persist' }),
				field((s) => s.linked, { source: '$url' }),
				field((s) => s.query, { source: 'url' }),
			],
		})
		render(
			<PersistProvider
				adapters={{
					first: { port: memoryPort() },
					$persist: { port: memoryPort() },
					$url: { port: memoryPort() },
					url: { port: memoryPort() },
				}}
			>
				<Mount store={value} />
			</PersistProvider>,
		)
		expect(persistHandle(value).source).toBe('first')
		expect(urlHandle(value).source).toBe('url')
		expect(persistHandle(value, '$persist').source).toBe('$persist')
		expect(persistHandle(value, '$url').source).toBe('$url')
		expect(persistHandle(value, '$persist')).not.toBe(persistHandle(value))
		await act(async () => {
			value.first = 1
			value.persisted = 2
			value.linked = 3
			await persistHandle(value, '$persist').reset()
			await persistHandle(value, '$url').reset()
		})
		expect(value).toMatchObject({ first: 1, persisted: 0, linked: 0 })
	})

	it('rejects unknown explicit sources with the available names instead of a successful no-op', () => {
		const value = observable({ width: 320 })
		applyPersist<typeof value, typeof value>(value, objectPort, {
			fields: (field) => [field((s) => s.width, { source: 'server' })],
		})
		render(
			<PersistProvider adapters={{ server: { port: memoryPort() } }}>
				<Mount store={value} />
			</PersistProvider>,
		)
		expect(() => persistHandle(value, 'sevrer')).toThrow(/Unknown persistence source "sevrer"; available: server/)
		expect(() => urlHandle(value, 'sevrer')).toThrow(/Unknown persistence source/)
	})

	it('retains inert shorthand handles and supports an explicitly named URL alias', async () => {
		const value = observable({ query: '' })
		applyPersist<typeof value, typeof value>(value, objectPort, {
			fields: (field) => [field((s) => s.query, { source: 'router' })],
		})
		render(
			<PersistProvider adapters={{ router: { port: memoryPort() } }}>
				<Mount store={value} />
			</PersistProvider>,
		)
		expect(urlHandle(value).source).toBeNull()
		await expect(urlHandle(value).restore()).resolves.toEqual({ status: 'idle' })
		await expect(urlHandle(value).flush()).resolves.toBeUndefined()
		expect(urlHandle(value, 'router').source).toBe('router')
	})

	it('rejects an unknown reset field atomically before changing a valid selected field', async () => {
		const value = observable({ width: 320, other: 400 })
		const server = memoryPort()
		applyPersist<typeof value, typeof value>(value, objectPort, {
			fields: (field) => [field((s) => s.width, { source: 'server' }), field((s) => s.other, { source: 'server' })],
		})
		render(
			<PersistProvider adapters={{ server: { port: server } }}>
				<Mount store={value} />
			</PersistProvider>,
		)
		await act(async () => {
			value.width = 500
			value.other = 600
			await persistHandle(value, 'server').flush()
		})
		const commits = server.set.mock.calls.length
		await act(async () => {
			await expect(
				persistHandle(value as object, 'server').reset({ fields: [['width'], ['missing']] }),
			).rejects.toThrow(/Unknown reset field/)
		})
		expect(value).toMatchObject({ width: 500, other: 600 })
		expect(server.set).toHaveBeenCalledTimes(commits)
	})
})
