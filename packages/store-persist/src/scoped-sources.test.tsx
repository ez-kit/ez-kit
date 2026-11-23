import { useCapabilities, useServices } from '@ez-kit/store-core/react'
import { act, render, screen } from '@testing-library/react'
import { useRef, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createPersistEngine } from './engine'
import { persistHandle } from './handle'
import { useHydrated, usePersistStatus } from './plugin'
import { PersistProvider, usePersistence, usePersistEngines } from './provider'
import { createPersistEngines } from './service'
import { objectPort, observable } from './test-kit'
import { applyPersist } from './with-persist'

import type { FieldsBuilder, AccessorFieldOptions } from './accessor'
import type { PersistAdapter, PersistAdapters } from './provider'
import type { SourcePort } from './types'

function port() {
	return { get: vi.fn(() => new Map<string, string>()), set: vi.fn() } satisfies SourcePort
}

function store(options: AccessorFieldOptions<string> = {}) {
	const value = observable({ q: '' })
	applyPersist(value, objectPort, {
		fields: ((field) => [field((state) => state.q, options)]) satisfies FieldsBuilder<{ q: string }>,
	})
	return value
}

function Mount({ value, id = 'one', children }: { value: object; id?: string; children?: ReactNode }) {
	useCapabilities(value, useServices(), { path: ['devices'], name: 'panel', id })
	return <>{children}</>
}

function Registry({ label }: { label: string }) {
	const sources = usePersistence().sources()
	const mounts = usePersistEngines()
	return <span data-testid={label}>{JSON.stringify({ sources, mounts: [...(mounts?.keys() ?? [])] })}</span>
}

describe('scoped source registration', () => {
	it.each(['timeout', 'error'] as const)(
		'waits for mixed sources until the async read reaches %s',
		async (terminal) => {
			vi.useFakeTimers()
			try {
				let reject!: (reason: Error) => void
				const pending = new Promise<Map<string, string>>((_resolve, no) => {
					reject = no
				})
				const value = observable({ q: '', note: '' })
				applyPersist<typeof value, typeof value>(value, objectPort, {
					restore: { timeoutMs: 20 },
					fields: (field) => [
						field((state) => state.q, { source: 'browser' }),
						field((state) => state.note, { source: 'server' }),
					],
				})
				function View() {
					const status = usePersistStatus(value)
					const server = usePersistStatus(value, 'server')
					return (
						<span data-testid='mixed-status'>
							{String(useHydrated(value))}:{status.restore}:{server.restore}
						</span>
					)
				}
				render(
					<PersistProvider
						adapters={{ browser: { port: port() }, server: { port: { get: () => pending, set: () => undefined } } }}
					>
						<Mount value={value}>
							<View />
						</Mount>
					</PersistProvider>,
				)
				expect(screen.getByTestId('mixed-status')).toHaveTextContent('false:pending:pending')
				await act(async () => {
					if (terminal === 'error') reject(new Error('offline'))
					else await vi.advanceTimersByTimeAsync(20)
				})
				expect(screen.getByTestId('mixed-status')).toHaveTextContent(`true:${terminal}:${terminal}`)
			} finally {
				vi.useRealTimers()
			}
		},
	)
	it('preflights all scope capabilities and returns independent source outcomes', async () => {
		const success = vi.fn()
		const failure = vi.fn(() => Promise.reject(new Error('backend unavailable')))
		const browser = createPersistEngine({ ...port(), removeScope: success })
		const server = createPersistEngine({ ...port(), removeScope: failure })
		const url = createPersistEngine(port())
		const registry = createPersistEngines(
			new Map([
				['browser', browser],
				['server', server],
				['url', url],
			]),
		)
		await expect(registry.resetScope({ path: ['devices'] })).rejects.toThrow('full scope deletion')
		expect(success).not.toHaveBeenCalled()
		expect(failure).not.toHaveBeenCalled()
		const outcomes = await registry.resetScope({ path: ['devices'], sources: ['browser', 'server'] })
		expect(outcomes.browser?.status).toBe('fulfilled')
		expect(outcomes.server?.status).toBe('rejected')
	})
	it('merges default and explicit declarations resolving to the same source', async () => {
		const server = port()
		const value = observable({ q: '', note: '' })
		applyPersist<typeof value, typeof value>(value, objectPort, {
			fields: (field) => [field((state) => state.q, {}), field((state) => state.note, { source: 'server' })],
		})
		render(
			<PersistProvider
				adapters={{ server: { port: server } }}
				defaultSource='server'
			>
				<Mount value={value} />
			</PersistProvider>,
		)
		expect(server.get).toHaveBeenCalledTimes(1)
		await act(async () => {
			value.q = 'a'
			value.note = 'b'
			await persistHandle(value, 'server').reset()
		})
		expect(value).toMatchObject({ q: '', note: '' })
	})
	it('resolves map aliases/defaultSource and writes only to the chosen source', async () => {
		const browser = port()
		const server = port()
		const value = store()
		render(
			<PersistProvider
				adapters={{ browser: { source: 'ignored', port: browser }, server: { port: server } }}
				defaultSource='browser'
			>
				<Mount value={value} />
			</PersistProvider>,
		)
		expect(browser.get).toHaveBeenCalledTimes(1)
		expect(server.get).not.toHaveBeenCalled()
		await act(async () => {
			value.q = 'boots'
			await Promise.resolve()
		})
		expect(browser.set).toHaveBeenCalledTimes(1)
		expect(server.set).not.toHaveBeenCalled()
	})

	it('explicit source wins over default and legacy arrays still register names', async () => {
		const browser = port()
		const server = port()
		const value = store({ source: 'server' })
		render(
			<PersistProvider
				adapters={[
					{ source: 'browser', port: browser },
					{ source: 'server', port: server },
				]}
				defaultSource='browser'
			>
				<Mount value={value} />
			</PersistProvider>,
		)
		await act(async () => {
			value.q = 'server-only'
			await Promise.resolve()
		})
		expect(server.set).toHaveBeenCalledTimes(1)
		expect(browser.get).not.toHaveBeenCalled()
	})

	it('inherits sources and shadows a source locally in both registry surfaces', () => {
		const parent = port()
		const child = port()
		const value = store({ source: 'server' })
		render(
			<PersistProvider adapters={{ browser: { port: parent }, server: { port: parent } }}>
				<Registry label='outer' />
				<PersistProvider adapters={{ server: { port: child } }}>
					<Registry label='inner' />
					<Mount value={value} />
				</PersistProvider>
			</PersistProvider>,
		)
		expect(screen.getByTestId('inner').textContent).toBe(screen.getByTestId('outer').textContent)
		expect(child.get).toHaveBeenCalledTimes(1)
		expect(parent.get).not.toHaveBeenCalled()
	})

	it('rejects missing default, unknown source and duplicate array names before reads', () => {
		const adapter = { source: 'one', port: port() }
		for (const options of [{}, { source: 'missing' }]) {
			expect(() =>
				render(
					<PersistProvider adapters={[adapter]}>
						<Mount value={store(options)} />
					</PersistProvider>,
				),
			).toThrow(/source|defaultSource/i)
		}
		expect(() => render(<PersistProvider adapters={[adapter, adapter]}>x</PersistProvider>)).toThrow(/duplicate/)
		expect(adapter.port.get).not.toHaveBeenCalled()
	})

	it('does not rerun router hooks in an array loop or recreate engines on reordered map keys', () => {
		const a = port()
		const b = port()
		const router: PersistAdapter = {
			source: 'a',
			usePort() {
				const ref = useRef(a)
				return { port: ref.current, changeKey: '' }
			},
		}
		const value = store({ source: 'a' })
		const first: PersistAdapters = { a: router, b: { port: b } }
		const view = render(
			<PersistProvider adapters={first}>
				<Mount value={value} />
			</PersistProvider>,
		)
		view.rerender(
			<PersistProvider adapters={{ b: { port: b }, a: router }}>
				<Mount value={value} />
			</PersistProvider>,
		)
		expect(a.get).toHaveBeenCalledTimes(1)
	})

	it('rejects port replacement under an unchanged name', () => {
		const view = render(<PersistProvider adapters={{ one: { port: port() } }}>x</PersistProvider>)
		expect(() => {
			view.rerender(<PersistProvider adapters={{ one: { port: port() } }}>x</PersistProvider>)
		}).toThrow(/Registration changed/)
	})

	it('unmounting a child does not dispose its inherited parent writer', async () => {
		const browser = port()
		const value = store({ source: 'browser' })
		const adapters = { browser: { port: browser } }
		function App({ child }: { child: boolean }) {
			return (
				<PersistProvider adapters={adapters}>
					<Mount value={value} />
					{child ? (
						<PersistProvider adapters={{}}>
							<Registry label='child' />
						</PersistProvider>
					) : null}
				</PersistProvider>
			)
		}
		const view = render(<App child />)
		view.rerender(<App child={false} />)
		await act(async () => {
			value.q = 'still-connected'
			await Promise.resolve()
		})
		expect(browser.get).toHaveBeenCalledTimes(1)
		expect(browser.set).toHaveBeenCalledTimes(1)
	})
})
