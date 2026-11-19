import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createContextStore } from '../create-context-store'
import { pipe } from '../index'
import { createStoreCache } from '../store-cache'

import { localStorageAdapter } from './storage'

import {
	persistHandle,
	PersistProvider,
	serializePersistAddress,
	usePersistence,
	usePersistStatus,
	withPersist,
} from './index'

import type { StoreCache } from '../store-cache'
import type { PersistEngines, SourcePort } from './index'
import type { StoreApi } from 'zustand/vanilla'

const storageKey = 'scoped-test'
function group(cache: StoreCache) {
	return cache.createCachedStore(
		({ defaultValue }: { defaultValue: { width?: number } }) =>
			pipe(
				createStore(() => ({ width: defaultValue.width ?? 320 })),
				withPersist({ fields: (field) => [field((state) => state.width, {})] }),
			),
		{ name: 'panel' },
	)
}

beforeEach(() => {
	localStorage.clear()
})
afterEach(() => {
	vi.useRealTimers()
})

describe('scoped Zustand persistence', () => {
	it('isolates scoped cached stores, preserves closed values and resets the full scope', async () => {
		const cache = createStoreCache()
		const panel = group(cache)
		const closedKey = serializePersistAddress({
			store: { path: ['devices', 'details'], name: 'panel', id: 'closed' },
			field: ['width'],
		})
		localStorage.setItem(
			storageKey,
			JSON.stringify({
				v: 0,
				s: { [closedKey]: JSON.stringify({ kind: 'ez-kit.persist.record', version: 0, value: '800' }), legacy: 'keep' },
			}),
		)
		let persistence: PersistEngines | undefined
		const stores = new Map<string, StoreApi<{ width: number }>>()
		const renders: string[] = []
		function View({ name }: { name: string }) {
			stores.set(name, panel.useStore())
			persistence = usePersistence()
			renders.push(usePersistStatus(panel.useStore()).restore)
			return <span data-testid={name}>{panel.useSelector((state) => state.width)}</span>
		}
		render(
			<PersistProvider
				adapters={{ browser: localStorageAdapter({ storageKey }) }}
				defaultSource='browser'
			>
				<cache.Provider>
					{['devices', 'users'].map((name) => (
						<cache.Scope
							key={name}
							path={[name]}
						>
							<panel.Provider
								id='workspace'
								defaultValue={{ width: 320 }}
							>
								<View name={name} />
							</panel.Provider>
						</cache.Scope>
					))}
				</cache.Provider>
			</PersistProvider>,
		)
		expect(renders[0]).toBe('pending')
		await act(async () => {
			stores.get('devices')?.setState({ width: 500 })
			stores.get('users')?.setState({ width: 600 })
			await Promise.resolve()
		})
		await act(async () => {
			await persistence?.resetScope({ path: ['devices'] })
		})
		expect(screen.getByTestId('devices')).toHaveTextContent('320')
		expect(screen.getByTestId('users')).toHaveTextContent('600')
		const blob = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as { s: Record<string, string> }
		expect(blob.s[closedKey]).toBeUndefined()
		expect(blob.s.legacy).toBe('keep')
	})

	it('uses an explicit context address and recreates its instance when address changes', () => {
		const panel = createContextStore(
			() =>
				pipe(
					createStore(() => ({ width: 320 })),
					withPersist({ fields: (field) => [field((state) => state.width, {})] }),
				),
			{ name: 'context-panel' },
		)
		const handles: StoreApi<{ width: number }>[] = []
		function View() {
			handles.push(panel.useStore())
			return <span>{panel.useSelector((state) => state.width)}</span>
		}
		const adapters = { browser: localStorageAdapter({ storageKey }) }
		function App({ page }: { page: string }) {
			return (
				<PersistProvider
					adapters={adapters}
					defaultSource='browser'
				>
					<panel.Provider address={{ path: [page], name: 'context-panel', id: 'workspace' }}>
						<View />
					</panel.Provider>
				</PersistProvider>
			)
		}
		const view = render(<App page='devices' />)
		const first = handles[0]
		view.rerender(<App page='users' />)
		expect(handles.at(-1)).not.toBe(first)
	})

	it('rejects independent context instances colliding at one address', () => {
		const panel = createContextStore(() =>
			pipe(
				createStore(() => ({ width: 320 })),
				withPersist({ fields: (field) => [field((state) => state.width, {})] }),
			),
		)
		expect(() =>
			render(
				<PersistProvider
					adapters={{ browser: localStorageAdapter({ storageKey }) }}
					defaultSource='browser'
				>
					<panel.Provider />
					<panel.Provider />
				</PersistProvider>,
			),
		).toThrow(/collision/)
	})

	it('cache-hit retains terminal timeout and does not read again under StrictMode', async () => {
		vi.useFakeTimers()
		const cache = createStoreCache()
		const get = vi.fn(() => new Promise<Map<string, string>>(() => undefined))
		const port: SourcePort = { get, set: () => undefined }
		const adapters = { server: { port } }
		const panel = cache.createCachedStore(
			() =>
				pipe(
					createStore(() => ({ width: 320 })),
					withPersist({ restore: { timeoutMs: 20 }, fields: (field) => [field((state) => state.width, {})] }),
				),
			{ name: 'timed-panel', gcTime: 50 },
		)
		function Status() {
			return <span data-testid='status'>{usePersistStatus(panel.useStore()).restore}</span>
		}
		function App({ visible }: { visible: boolean }) {
			return (
				<StrictMode>
					<PersistProvider
						adapters={adapters}
						defaultSource='server'
					>
						<cache.Provider>
							{visible ? (
								<panel.Provider id='workspace'>
									<Status />
								</panel.Provider>
							) : null}
						</cache.Provider>
					</PersistProvider>
				</StrictMode>
			)
		}
		const view = render(<App visible />)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(20)
		})
		expect(screen.getByTestId('status')).toHaveTextContent('timeout')
		view.rerender(<App visible={false} />)
		view.rerender(<App visible />)
		expect(screen.getByTestId('status')).toHaveTextContent('timeout')
		expect(get).toHaveBeenCalledTimes(1)
		view.rerender(<App visible={false} />)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(51)
		})
		view.rerender(<App visible />)
		expect(get).toHaveBeenCalledTimes(2)
		expect(screen.getByTestId('status')).toHaveTextContent('pending')
	})

	it('rejects reusing retained instances under a remounted registry', () => {
		const cache = createStoreCache()
		const panel = group(cache)
		const adapters = { browser: localStorageAdapter({ storageKey }) }
		function App({ version }: { version: number }) {
			return (
				<cache.Provider>
					<PersistProvider
						key={version}
						adapters={adapters}
						defaultSource='browser'
					>
						<panel.Provider
							id='workspace'
							defaultValue={{}}
						/>
					</PersistProvider>
				</cache.Provider>
			)
		}
		const view = render(<App version={1} />)
		expect(() => {
			view.rerender(<App version={2} />)
		}).toThrow(/Registry changed/)
	})

	it('handle operations and status stay off the serialized state', async () => {
		const panel = createContextStore(() =>
			pipe(
				createStore(() => ({ width: 320 })),
				withPersist({ fields: (field) => [field((state) => state.width, {})] }),
			),
		)
		let handle: ReturnType<typeof panel.useStore> | undefined
		function View() {
			handle = panel.useStore()
			return null
		}
		render(
			<PersistProvider
				adapters={{ browser: localStorageAdapter({ storageKey }) }}
				defaultSource='browser'
			>
				<panel.Provider>
					<View />
				</panel.Provider>
			</PersistProvider>,
		)
		await act(async () => {
			handle?.setState({ width: 500 })
			if (handle) await persistHandle(handle, 'browser').flush()
		})
		expect(handle?.getState()).toEqual({ width: 500 })
		expect(Object.keys(handle ?? {})).not.toContain('$persist')
	})
})
