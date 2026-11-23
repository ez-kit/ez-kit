import { act, render, screen } from '@testing-library/react'
import { proxy } from 'valtio'
import { beforeEach, describe, expect, it } from 'vitest'

import { createContextStore } from '../create-context-store'
import { pipe } from '../index'
import { createStoreCache } from '../store-cache'

import { localStorageAdapter } from './storage'

import { persistHandle, PersistProvider, usePersistence, withPersist } from './index'

import type { PersistEngines } from './index'

const storageKey = 'valtio-scoped'
beforeEach(() => {
	localStorage.clear()
})

describe('scoped Valtio persistence', () => {
	it('isolates cached scopes and resets retained values without replacing proxies', async () => {
		const cache = createStoreCache()
		const panel = cache.createCachedStore(
			() => pipe(proxy({ width: 320 }), withPersist({ fields: (field) => [field((state) => state.width, {})] })),
			{ name: 'panel' },
		)
		const stores = new Map<string, ReturnType<typeof panel.useStore>>()
		let persistence: PersistEngines | undefined
		function View({ name }: { name: string }) {
			stores.set(name, panel.useStore())
			persistence = usePersistence()
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
							<panel.Provider id='workspace'>
								<View name={name} />
							</panel.Provider>
						</cache.Scope>
					))}
				</cache.Provider>
			</PersistProvider>,
		)
		const original = stores.get('devices')
		await act(async () => {
			const devices = stores.get('devices')
			const users = stores.get('users')
			if (devices) devices.width = 500
			if (users) users.width = 600
			await Promise.resolve()
		})
		await act(async () => {
			await persistence?.resetScope({ path: ['devices'] })
		})
		expect(screen.getByTestId('devices')).toHaveTextContent('320')
		expect(screen.getByTestId('users')).toHaveTextContent('600')
		expect(stores.get('devices')).toBe(original)
	})

	it('recreates a context store on explicit address changes', () => {
		const panel = createContextStore(() =>
			pipe(proxy({ width: 320 }), withPersist({ fields: (field) => [field((state) => state.width, {})] })),
		)
		const seen: object[] = []
		const adapters = { browser: localStorageAdapter({ storageKey }) }
		function View() {
			seen.push(panel.useStore())
			return null
		}
		function App({ page }: { page: string }) {
			return (
				<PersistProvider
					adapters={adapters}
					defaultSource='browser'
				>
					<panel.Provider address={{ path: [page], name: 'panel', id: 'workspace' }}>
						<View />
					</panel.Provider>
				</PersistProvider>
			)
		}
		const view = render(<App page='devices' />)
		view.rerender(<App page='users' />)
		expect(seen[0]).not.toBe(seen.at(-1))
	})

	it('snapshots original nested defaults, observes mutations and excludes diagnostic handles', async () => {
		const panel = createContextStore(() =>
			pipe(
				proxy({ layout: { width: 320 } }),
				withPersist({
					fields: (field) => [
						field((state) => state.layout, {
							parser: { parse: (raw) => JSON.parse(raw) as { width: number }, stringify: JSON.stringify },
						}),
					],
				}),
			),
		)
		let current: ReturnType<typeof panel.useStore> | undefined
		function View() {
			current = panel.useStore()
			return <span data-testid='width'>{panel.useSelector((state) => state.layout.width)}</span>
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
			if (current) {
				current.layout.width = 500
				await persistHandle(current, 'browser').flush()
			}
		})
		expect(screen.getByTestId('width')).toHaveTextContent('500')
		await act(async () => {
			if (current) await persistHandle(current).reset()
		})
		expect(screen.getByTestId('width')).toHaveTextContent('320')
		expect(JSON.stringify(current)).toBe('{"layout":{"width":320}}')
	})
})
