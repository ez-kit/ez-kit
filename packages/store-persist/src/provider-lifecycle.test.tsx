import { createServiceRegistry, serializePersistAddress, serviceKey } from '@ez-kit/store-core'
import { ServicesProvider, useCapabilities, useServices } from '@ez-kit/store-core/react'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { paramString } from './codecs'
import { persistHandle } from './handle'
import { usePersistStatus } from './plugin'
import { PersistProvider } from './provider'
import { objectPort, observable } from './test-kit'
import { createUrlPort } from './url/adapter'
import { applyPersist } from './with-persist'

import type { Keyed, SourcePort } from './types'

function Mount({ store }: { store: object }) {
	useCapabilities(store, useServices(), { path: [], name: 'panel', id: 'one' })
	return null
}

describe('provider lifecycle invariants', () => {
	it('resolves source-specific restore deadlines and external policies through effective aliases', async () => {
		vi.useFakeTimers()
		try {
			const value = observable({ q: '', note: '', fast: '', slow: '' })
			const restore = Object.freeze({
				timeoutMs: 100,
				externalChanges: 'ignore' as const,
				sources: Object.freeze({
					browser: Object.freeze({ externalChanges: 'apply' as const }),
					fast: Object.freeze({ timeoutMs: 10 }),
					slow: Object.freeze({ timeoutMs: 40, externalChanges: 'apply' as const }),
					unused: Object.freeze({ timeoutMs: 1 }),
				}),
			})
			applyPersist<typeof value, typeof value>(value, objectPort, {
				restore,
				fields: (field) => [
					field((state) => state.q, {}),
					field((state) => state.note, { source: 'browser' }),
					field((state) => state.fast, { source: 'fast' }),
					field((state) => state.slow, { source: 'slow' }),
				],
			})
			let browserValues: Keyed = new Map()
			let fastValues: Keyed | Promise<Keyed> = new Promise(() => undefined)
			let slowValues: Keyed | Promise<Keyed> = new Promise(() => undefined)
			let browserChange = (): void => undefined
			let fastChange = (): void => undefined
			let slowChange = (): void => undefined
			const browserGet = vi.fn(() => browserValues)
			const fastGet = vi.fn(() => fastValues)
			const slowGet = vi.fn(() => slowValues)
			const browser: SourcePort = {
				get: browserGet,
				set: () => undefined,
				subscribe(listener) {
					browserChange = listener
					return () => undefined
				},
			}
			const fast: SourcePort = {
				get: fastGet,
				set: () => undefined,
				subscribe(listener) {
					fastChange = listener
					return () => undefined
				},
			}
			const slow: SourcePort = {
				get: slowGet,
				set: () => undefined,
				subscribe(listener) {
					slowChange = listener
					return () => undefined
				},
			}
			function Status() {
				return (
					<span data-testid='status'>
						{usePersistStatus(value, 'browser').restore}:{usePersistStatus(value, 'fast').restore}:
						{usePersistStatus(value, 'slow').restore}
					</span>
				)
			}
			function Bind() {
				useCapabilities(value, useServices(), { path: [], name: 'panel', id: 'one' })
				return <Status />
			}
			render(
				<PersistProvider
					adapters={{
						browser: { source: 'ignored-alias', port: browser },
						fast: { port: fast },
						slow: { port: slow },
						unused: { port: { get: () => new Map<string, string>(), set: () => undefined } },
					}}
					defaultSource='browser'
				>
					<Bind />
				</PersistProvider>,
			)
			expect(screen.getByTestId('status')).toHaveTextContent('ready:pending:pending')
			const fastPending = persistHandle(value, 'fast').restore({ timeoutMs: 1000 })
			const slowPending = persistHandle(value, 'slow').restore({ timeoutMs: 1 })
			await act(async () => {
				await vi.advanceTimersByTimeAsync(10)
			})
			expect((await fastPending).status).toBe('timeout')
			expect(screen.getByTestId('status')).toHaveTextContent('ready:timeout:pending')
			await act(async () => {
				await vi.advanceTimersByTimeAsync(30)
			})
			expect((await slowPending).status).toBe('timeout')
			expect(browserGet).toHaveBeenCalledTimes(1)
			expect(fastGet).toHaveBeenCalledTimes(1)
			expect(slowGet).toHaveBeenCalledTimes(1)
			const key = (field: string) =>
				serializePersistAddress({ store: { path: [], name: 'panel', id: 'one' }, field: [field] })
			await act(async () => {
				browserValues = new Map([[key('q'), 'browser-external']])
				fastValues = new Map([[key('fast'), 'fast-external']])
				slowValues = new Map([[key('slow'), 'slow-external']])
				browserChange()
				fastChange()
				slowChange()
				await Promise.resolve()
			})
			expect(value.q).toBe('browser-external')
			expect(value.fast).toBe('')
			expect(value.slow).toBe('slow-external')
			expect(restore.sources.fast).toEqual({ timeoutMs: 10 })
		} finally {
			vi.useRealTimers()
		}
	})

	it('rejects unknown restore aliases before connecting any source', () => {
		const value = observable({ q: '' })
		applyPersist<typeof value, typeof value>(value, objectPort, {
			restore: { sources: { localStorage: { timeoutMs: 10 } } },
			fields: (field) => [field((state) => state.q, {})],
		})
		const get = vi.fn(() => new Map<string, string>())
		expect(() =>
			render(
				<PersistProvider
					adapters={{ browser: { source: 'localStorage', port: { get, set: () => undefined } } }}
					defaultSource='browser'
				>
					<Mount store={value} />
				</PersistProvider>,
			),
		).toThrow(/Unknown restore source "localStorage"; available: browser/)
		expect(get).not.toHaveBeenCalled()
	})

	it('diagnoses an unknown named status source after alias resolution', () => {
		const value = observable({ q: '' })
		applyPersist<typeof value, typeof value>(value, objectPort, { fields: (field) => [field((state) => state.q, {})] })
		function Status() {
			usePersistStatus(value, 'sevrer')
			return null
		}
		function Bind() {
			useCapabilities(value, useServices(), { path: [], name: 'panel', id: 'one' })
			return <Status />
		}
		const get = vi.fn(() => new Map<string, string>())
		expect(() =>
			render(
				<PersistProvider
					adapters={{ server: { port: { get, set: () => undefined } } }}
					defaultSource='server'
				>
					<Bind />
				</PersistProvider>,
			),
		).toThrow(/Unknown persistence source "sevrer"; available: server/)
		expect(get).not.toHaveBeenCalled()
	})

	it('treats literal handle-like source names as named status selectors', () => {
		const value = observable({ q: '', other: '' })
		applyPersist<typeof value, typeof value>(value, objectPort, {
			fields: (field) => [
				field((state) => state.q, { source: '$persist' }),
				field((state) => state.other, { source: '$url' }),
			],
		})
		function Status() {
			return (
				<span data-testid='literal-status'>
					{usePersistStatus(value, '$persist').restore}:{usePersistStatus(value, '$url').restore}
				</span>
			)
		}
		function Bind() {
			useCapabilities(value, useServices(), { path: [], name: 'panel', id: 'one' })
			return <Status />
		}
		const sync = { get: () => new Map<string, string>(), set: () => undefined }
		const asyncPort = { get: () => new Promise<Keyed>(() => undefined), set: () => undefined }
		render(
			<PersistProvider adapters={{ $persist: { port: sync }, $url: { port: asyncPort } }}>
				<Bind />
			</PersistProvider>,
		)
		expect(screen.getByTestId('literal-status')).toHaveTextContent('ready:pending')
	})
	it('preserves the persistence registry when unrelated services change', () => {
		const value = observable({ q: '' })
		applyPersist<typeof value, typeof value>(value, objectPort, {
			fields: (field) => [field((state) => state.q, { source: 'server' })],
		})
		const get = vi.fn(() => new Map<string, string>())
		const adapters = { server: { port: { get, set: () => undefined } } }
		const locale = serviceKey<string>('locale')
		const initial = createServiceRegistry([[locale, 'en']])
		const updated = createServiceRegistry([[locale, 'fr']])
		const tree = (registry: typeof initial) => (
			<ServicesProvider registry={registry}>
				<PersistProvider adapters={adapters}>
					<Mount store={value} />
				</PersistProvider>
			</ServicesProvider>
		)
		const view = render(tree(initial))
		expect(() => {
			view.rerender(tree(updated))
		}).not.toThrow()
		expect(get).toHaveBeenCalledTimes(1)
	})

	it('rejects a replaced render-scoped port before reading or subscribing to it', () => {
		const value = observable({ q: '' })
		applyPersist<typeof value, typeof value>(value, objectPort, {
			fields: (field) => [field((state) => state.q, { source: 'url', parser: paramString() })],
		})
		const first = createUrlPort({ read: () => new URLSearchParams('q=first'), commit: () => undefined })
		const read = vi.fn(() => new URLSearchParams('q=second'))
		const second = createUrlPort({ read, commit: () => undefined })
		let current = first
		const adapters = { url: { usePort: () => ({ port: current, changeKey: 'query' }) } }
		const tree = () => (
			<PersistProvider adapters={adapters}>
				<Mount store={value} />
			</PersistProvider>
		)
		const view = render(tree())
		current = second
		expect(() => {
			view.rerender(tree())
		}).toThrow(/Registration changed.*remount/)
		expect(read).not.toHaveBeenCalled()
	})
})
