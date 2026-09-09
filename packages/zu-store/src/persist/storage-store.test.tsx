import { pipe } from '@ez-kit/store-core'
import { PERSIST_HANDLE, URL_HANDLE } from '@ez-kit/store-persist/internals'
import { render, screen, waitFor } from '@testing-library/react'
import { type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createContextStore } from '../create-context-store'
import { StoreProvider } from '../store-provider'

import { DEFAULT_STORAGE_KEY, localStorageAdapter, sessionStorageAdapter } from './storage'
import { createFakePersistAdapter } from './testing'

import { paramString, useHydrated, withPersist } from './index'

import type { FieldsBuilder } from './index'
import type { StoreApi } from 'zustand/vanilla'

type Filters = { q: string; page: string }

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

/** A non-cached persist store: plain Zustand handle, capabilities attached through `pipe`. */
function persistFieldsStore(fields: FieldsBuilder<Filters>) {
	return createContextStore<StoreApi<Filters>>(() =>
		pipe(
			createStore<Filters>()(() => ({ q: '', page: '' })),
			withPersist<StoreApi<Filters>>({ fields }),
		),
	)
}

describe('@ez-kit/zu-store persist storage adapters', () => {
	it('round-trips a value through localStorage across mounts', async () => {
		const store = persistFieldsStore((field) => [
			field((state) => state.q, { source: 'localStorage', parser: paramString() }),
		])

		function Editor(): ReactElement {
			const q = store.useSelector((state) => state.q)
			const handle = store.useStore()
			return (
				<button
					type='button'
					data-testid='q'
					onClick={() => {
						handle.setState({ q: 'boots' })
					}}
				>
					{q || 'empty'}
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

	it('keeps a default-valued field out of the blob (clearOnDefault)', async () => {
		const store = persistFieldsStore((field) => [
			field((state) => state.q, { source: 'localStorage', parser: paramString() }),
			field((state) => state.page, { source: 'localStorage', parser: paramString() }),
		])

		function Editor(): ReactElement {
			const handle = store.useStore()
			return (
				<button
					type='button'
					data-testid='go'
					onClick={() => {
						handle.setState({ q: 'shoes' })
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
		const store = persistFieldsStore((field) => [
			field((state) => state.q, { source: 'sessionStorage', parser: paramString() }),
		])

		function Editor(): ReactElement {
			const handle = store.useStore()
			return (
				<button
					type='button'
					data-testid='go'
					onClick={() => {
						handle.setState({ q: 'hat' })
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

describe('@ez-kit/zu-store persist dual-source (URL + storage)', () => {
	const makeDualStore = () =>
		persistFieldsStore((field) => [
			field((state) => state.q, { source: 'url', parser: paramString() }),
			field((state) => state.q, { source: 'localStorage', parser: paramString() }),
		])

	it('lets the URL win over a stale stored value on cold start (first-present-wins)', async () => {
		window.localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify({ v: 0, s: { q: 'cached' } }))
		const fake = createFakePersistAdapter('?q=shoes')
		const dualStore = makeDualStore()

		function QView(): ReactElement {
			const q = dualStore.useSelector((state) => state.q)
			return <span data-testid='q'>{q}</span>
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
			const handle = dualStore.useStore()
			return (
				<button
					type='button'
					data-testid='go'
					onClick={() => {
						handle.setState({ q: 'boots' })
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

	it('exposes both $url and $persist handles on the store handle, without collision', async () => {
		const fake = createFakePersistAdapter()
		const dualStore = makeDualStore()
		let captured: StoreApi<Filters> | null = null

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
			const handle = captured as unknown as Record<string, { source: string } | undefined>
			expect(handle[URL_HANDLE]?.source).toBe('url')
		})
		const handle = captured as unknown as Record<string, { source: string } | undefined>
		expect(handle[PERSIST_HANDLE]?.source).toBe('localStorage')
		// The handles hang off the Zustand handle, never off the state it hands out.
		expect(Object.keys((captured as unknown as StoreApi<Filters>).getState())).toEqual(['q', 'page'])
	})
})

describe('@ez-kit/zu-store persist useHydrated', () => {
	const makeStore = () =>
		persistFieldsStore((field) => [field((state) => state.q, { source: 'localStorage', parser: paramString() })])

	function Gate({ store }: { store: ReturnType<typeof makeStore> }): ReactElement {
		const hydrated = useHydrated(store.useStore())
		return <span data-testid='state'>{hydrated ? 'ready' : 'loading'}</span>
	}

	it('is false on the server render', () => {
		const store = makeStore()
		const html = renderToString(
			<StoreProvider persist={[localStorageAdapter()]}>
				<store.Provider>
					<Gate store={store} />
				</store.Provider>
			</StoreProvider>,
		)
		expect(html).toContain('loading')
		expect(html).not.toContain('ready')
	})

	it('flips to true after mount on the client', async () => {
		const store = makeStore()
		render(
			<StoreProvider persist={[localStorageAdapter()]}>
				<store.Provider>
					<Gate store={store} />
				</store.Provider>
			</StoreProvider>,
		)
		await waitFor(() => {
			expect(screen.getByTestId('state')).toHaveTextContent('ready')
		})
	})
})
