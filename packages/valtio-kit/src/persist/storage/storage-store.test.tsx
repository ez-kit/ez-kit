import { render, screen, waitFor } from '@testing-library/react'
import { type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { proxy } from 'valtio'
import { beforeEach, describe, expect, it } from 'vitest'

import { paramString } from '../codecs'
import { createPersistFields } from '../create-persist-store'
import { PERSIST_HANDLE, URL_HANDLE } from '../handle'
import { PersistProvider } from '../provider'
import { createFakePersistAdapter } from '../testing/fake-persist-adapter'

import { DEFAULT_STORAGE_KEY, localStorageAdapter, sessionStorageAdapter } from './adapter'

beforeEach(() => {
	window.localStorage.clear()
	window.sessionStorage.clear()
})

function blobOf(area: Storage): Record<string, string> {
	const raw = area.getItem(DEFAULT_STORAGE_KEY)
	if (!raw) {
		return {}
	}
	const parsed = JSON.parse(raw) as { s?: Record<string, string> }
	return parsed.s ?? {}
}

describe('@ez-kit/valtio-kit persist storage adapters', () => {
	it('round-trips a value through localStorage across mounts', async () => {
		const store = createPersistFields(
			() => proxy({ q: '' }),
			(field) => [field((s) => s.q, { source: 'localStorage', parser: paramString() })],
		)

		function Editor(): ReactElement {
			const snap = store.useSnapshot()
			const state = store.useStore()
			return (
				<button
					type='button'
					data-testid='q'
					onClick={() => {
						state.q = 'boots'
					}}
				>
					{snap.q || 'empty'}
				</button>
			)
		}

		const first = render(
			<PersistProvider adapters={[localStorageAdapter()]}>
				<store.Provider>
					<Editor />
				</store.Provider>
			</PersistProvider>,
		)

		screen.getByTestId('q').click()
		await waitFor(() => {
			expect(blobOf(window.localStorage).q).toBe('boots')
		})
		first.unmount()

		// A fresh mount hydrates from the persisted blob.
		render(
			<PersistProvider adapters={[localStorageAdapter()]}>
				<store.Provider>
					<Editor />
				</store.Provider>
			</PersistProvider>,
		)
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('boots')
		})
	})

	it('persists a default-valued field absent from the blob (clearOnDefault)', async () => {
		const store = createPersistFields(
			() => proxy({ q: '', page: '' }),
			(field) => [
				field((s) => s.q, { source: 'localStorage', parser: paramString() }),
				field((s) => s.page, { source: 'localStorage', parser: paramString() }),
			],
		)

		function Editor(): ReactElement {
			const state = store.useStore()
			return (
				<button
					type='button'
					data-testid='go'
					onClick={() => {
						state.q = 'shoes'
					}}
				/>
			)
		}

		render(
			<PersistProvider adapters={[localStorageAdapter()]}>
				<store.Provider>
					<Editor />
				</store.Provider>
			</PersistProvider>,
		)

		screen.getByTestId('go').click()
		await waitFor(() => {
			expect(blobOf(window.localStorage)).toEqual({ q: 'shoes' })
		})
		// `page` stayed at its default, so it never entered the blob.
		expect(blobOf(window.localStorage).page).toBeUndefined()
	})

	it('shares the same contract via sessionStorage', async () => {
		const store = createPersistFields(
			() => proxy({ q: '' }),
			(field) => [field((s) => s.q, { source: 'sessionStorage', parser: paramString() })],
		)

		function Editor(): ReactElement {
			const state = store.useStore()
			return (
				<button
					type='button'
					data-testid='go'
					onClick={() => {
						state.q = 'hat'
					}}
				/>
			)
		}

		render(
			<PersistProvider adapters={[sessionStorageAdapter()]}>
				<store.Provider>
					<Editor />
				</store.Provider>
			</PersistProvider>,
		)

		screen.getByTestId('go').click()
		await waitFor(() => {
			expect(blobOf(window.sessionStorage).q).toBe('hat')
			expect(window.localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull()
		})
	})
})

describe('@ez-kit/valtio-kit persist dual-source (URL + storage)', () => {
	const dualStore = createPersistFields(
		() => proxy({ q: '' }),
		(field) => [
			field((s) => s.q, { source: 'url', parser: paramString() }),
			field((s) => s.q, { source: 'localStorage', parser: paramString() }),
		],
	)

	it('lets the URL win over a stale stored value on cold start (first-present-wins)', async () => {
		window.localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify({ v: 0, s: { q: 'cached' } }))
		const fake = createFakePersistAdapter('?q=shoes')

		function QView(): ReactElement {
			const snap = dualStore.useSnapshot()
			return <span data-testid='q'>{snap.q}</span>
		}

		render(
			<PersistProvider adapters={[fake.adapter, localStorageAdapter()]}>
				<dualStore.Provider>
					<QView />
				</dualStore.Provider>
			</PersistProvider>,
		)

		// URL seeds synchronously and wins; the stale localStorage value never clobbers it.
		expect(screen.getByTestId('q')).toHaveTextContent('shoes')
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('shoes')
		})
	})

	it('writes a mutation to both the URL and storage', async () => {
		const fake = createFakePersistAdapter()

		function Editor(): ReactElement {
			const state = dualStore.useStore()
			return (
				<button
					type='button'
					data-testid='go'
					onClick={() => {
						state.q = 'boots'
					}}
				/>
			)
		}

		render(
			<PersistProvider adapters={[fake.adapter, localStorageAdapter()]}>
				<dualStore.Provider>
					<Editor />
				</dualStore.Provider>
			</PersistProvider>,
		)

		screen.getByTestId('go').click()
		await waitFor(() => {
			expect(fake.getSearch()).toContain('q=boots')
			expect(blobOf(window.localStorage).q).toBe('boots')
		})
	})

	it('exposes both $url and $persist handles without collision; inert on the server', () => {
		const fake = createFakePersistAdapter()
		let captured: Record<string, unknown> = {}

		function Capture(): ReactElement {
			captured = dualStore.useStore()
			return <span>ok</span>
		}

		render(
			<PersistProvider adapters={[fake.adapter, localStorageAdapter()]}>
				<dualStore.Provider>
					<Capture />
				</dualStore.Provider>
			</PersistProvider>,
		)

		const urlHandle = captured[URL_HANDLE] as { source: string } | undefined
		const persistHandle = captured[PERSIST_HANDLE] as { source: string } | undefined
		expect(urlHandle?.source).toBe('url')
		expect(persistHandle?.source).toBe('localStorage')
		// Handles are non-enumerable, so they never leak into the snapshot/serialization.
		expect(Object.keys(captured)).not.toContain(URL_HANDLE)
	})
})

describe('@ez-kit/valtio-kit persist useHydrated', () => {
	const store = createPersistFields(
		() => proxy({ q: '' }),
		(field) => [field((s) => s.q, { source: 'localStorage', parser: paramString() })],
	)

	function Gate(): ReactElement {
		const hydrated = store.useHydrated()
		return <span data-testid='state'>{hydrated ? 'ready' : 'loading'}</span>
	}

	it('is false on the server render', () => {
		const html = renderToString(
			<PersistProvider adapters={[localStorageAdapter()]}>
				<store.Provider>
					<Gate />
				</store.Provider>
			</PersistProvider>,
		)
		expect(html).toContain('loading')
		expect(html).not.toContain('ready')
	})

	it('flips to true after mount on the client', async () => {
		render(
			<PersistProvider adapters={[localStorageAdapter()]}>
				<store.Provider>
					<Gate />
				</store.Provider>
			</PersistProvider>,
		)
		await waitFor(() => {
			expect(screen.getByTestId('state')).toHaveTextContent('ready')
		})
	})
})
