import { render, screen, waitFor } from '@testing-library/react'
import { type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { proxy } from 'valtio'
import { beforeEach, describe, expect, it } from 'vitest'

import { createStore } from '../../create-store'
import { StoreProvider } from '../../store-provider'
import { paramString } from '../codecs'
import { PERSIST_HANDLE, URL_HANDLE } from '../handle'
import { persist, useHydrated } from '../plugin'
import { createFakePersistAdapter } from '../testing/fake-persist-adapter'

import { DEFAULT_STORAGE_KEY, localStorageAdapter, sessionStorageAdapter } from './adapter'

import type { FieldsBuilder } from '../accessor'

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

/** Build a non-cached persist store (factory + accessor fields) mounted via the `persist()` plugin. */
function persistFieldsStore<TState extends object>(factory: () => TState, fields: FieldsBuilder<object>) {
	return createStore<TState>(factory, { plugins: [persist({ fields })] })
}

describe('@ez-kit/va-store persist storage adapters', () => {
	it('round-trips a value through localStorage across mounts', async () => {
		const store = persistFieldsStore(
			() => proxy({ q: '' }),
			(field) => [field((s) => (s as { q: string }).q, { source: 'localStorage', parser: paramString() })],
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
			<StoreProvider persist={[localStorageAdapter()]}>
				<store.Provider>
					<Editor />
				</store.Provider>
			</StoreProvider>,
		)

		screen.getByTestId('q').click()
		await waitFor(() => {
			expect(blobOf(window.localStorage).q).toBe('boots')
		})
		first.unmount()

		// A fresh mount hydrates from the persisted blob.
		render(
			<StoreProvider persist={[localStorageAdapter()]}>
				<store.Provider>
					<Editor />
				</store.Provider>
			</StoreProvider>,
		)
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('boots')
		})
	})

	it('persists a default-valued field absent from the blob (clearOnDefault)', async () => {
		const store = persistFieldsStore(
			() => proxy({ q: '', page: '' }),
			(field) => [
				field((s) => (s as { q: string }).q, { source: 'localStorage', parser: paramString() }),
				field((s) => (s as { page: string }).page, { source: 'localStorage', parser: paramString() }),
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
			<StoreProvider persist={[localStorageAdapter()]}>
				<store.Provider>
					<Editor />
				</store.Provider>
			</StoreProvider>,
		)

		screen.getByTestId('go').click()
		await waitFor(() => {
			expect(blobOf(window.localStorage)).toEqual({ q: 'shoes' })
		})
		// `page` stayed at its default, so it never entered the blob.
		expect(blobOf(window.localStorage).page).toBeUndefined()
	})

	it('shares the same contract via sessionStorage', async () => {
		const store = persistFieldsStore(
			() => proxy({ q: '' }),
			(field) => [field((s) => (s as { q: string }).q, { source: 'sessionStorage', parser: paramString() })],
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
			<StoreProvider persist={[sessionStorageAdapter()]}>
				<store.Provider>
					<Editor />
				</store.Provider>
			</StoreProvider>,
		)

		screen.getByTestId('go').click()
		await waitFor(() => {
			expect(blobOf(window.sessionStorage).q).toBe('hat')
			expect(window.localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull()
		})
	})
})

describe('@ez-kit/va-store persist dual-source (URL + storage)', () => {
	const dualFields: FieldsBuilder<object> = (field) => [
		field((s) => (s as { q: string }).q, { source: 'url', parser: paramString() }),
		field((s) => (s as { q: string }).q, { source: 'localStorage', parser: paramString() }),
	]
	const makeDualStore = () =>
		createStore<{ q: string }>(() => proxy({ q: '' }), { plugins: [persist({ fields: dualFields })] })

	it('lets the URL win over a stale stored value on cold start (first-present-wins)', async () => {
		window.localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify({ v: 0, s: { q: 'cached' } }))
		const fake = createFakePersistAdapter('?q=shoes')
		const dualStore = makeDualStore()

		function QView(): ReactElement {
			const snap = dualStore.useSnapshot()
			return <span data-testid='q'>{snap.q}</span>
		}

		render(
			<StoreProvider persist={[fake.adapter, localStorageAdapter()]}>
				<dualStore.Provider>
					<QView />
				</dualStore.Provider>
			</StoreProvider>,
		)

		// URL connects first (adapter order) and wins; the stale localStorage value never clobbers it.
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('shoes')
		})
	})

	it('writes a mutation to both the URL and storage', async () => {
		const fake = createFakePersistAdapter()
		const dualStore = makeDualStore()

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
			<StoreProvider persist={[fake.adapter, localStorageAdapter()]}>
				<dualStore.Provider>
					<Editor />
				</dualStore.Provider>
			</StoreProvider>,
		)

		screen.getByTestId('go').click()
		await waitFor(() => {
			expect(fake.getSearch()).toContain('q=boots')
			expect(blobOf(window.localStorage).q).toBe('boots')
		})
	})

	it('exposes both $url and $persist handles without collision; non-enumerable', async () => {
		const fake = createFakePersistAdapter()
		const dualStore = makeDualStore()
		let captured: Record<string, unknown> = {}

		function Capture(): ReactElement {
			captured = dualStore.useStore()
			return <span>ok</span>
		}

		render(
			<StoreProvider persist={[fake.adapter, localStorageAdapter()]}>
				<dualStore.Provider>
					<Capture />
				</dualStore.Provider>
			</StoreProvider>,
		)

		await waitFor(() => {
			const urlHandle = captured[URL_HANDLE] as { source: string } | undefined
			expect(urlHandle?.source).toBe('url')
		})
		const persistHandle = captured[PERSIST_HANDLE] as { source: string } | undefined
		expect(persistHandle?.source).toBe('localStorage')
		// Handles are non-enumerable, so they never leak into the snapshot/serialization.
		expect(Object.keys(captured)).not.toContain(URL_HANDLE)
	})
})

describe('@ez-kit/va-store persist useHydrated', () => {
	const makeStore = () =>
		createStore<{ q: string }>(() => proxy({ q: '' }), {
			plugins: [persist({ fields: (field) => [field((s) => s.q, { source: 'localStorage', parser: paramString() })] })],
		})

	it('is false on the server render', () => {
		const store = makeStore()
		function Gate(): ReactElement {
			const hydrated = useHydrated(store.useStore())
			return <span data-testid='state'>{hydrated ? 'ready' : 'loading'}</span>
		}
		const html = renderToString(
			<StoreProvider persist={[localStorageAdapter()]}>
				<store.Provider>
					<Gate />
				</store.Provider>
			</StoreProvider>,
		)
		expect(html).toContain('loading')
		expect(html).not.toContain('ready')
	})

	it('flips to true after mount on the client', async () => {
		const store = makeStore()
		function Gate(): ReactElement {
			const hydrated = useHydrated(store.useStore())
			return <span data-testid='state'>{hydrated ? 'ready' : 'loading'}</span>
		}
		render(
			<StoreProvider persist={[localStorageAdapter()]}>
				<store.Provider>
					<Gate />
				</store.Provider>
			</StoreProvider>,
		)
		await waitFor(() => {
			expect(screen.getByTestId('state')).toHaveTextContent('ready')
		})
	})
})
