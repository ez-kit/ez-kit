import { pipe } from '@ez-kit/store-core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ReactElement, useSyncExternalStore } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { createContextStore } from '../create-context-store'
import { StoreProvider } from '../store-provider'

import { paramString, withPersist } from './index'

import type { StoreApi } from 'zustand/vanilla'

type Filters = { q: string }

/**
 * In-memory stand-in for the App Router navigation state. `useSearchParams`/`usePathname`
 * subscribe reactively so a `push`/`replace` re-renders consumers, mirroring `next/navigation`.
 */
const navStore = {
	pathname: '/',
	search: '',
	listeners: new Set<() => void>(),
	subscribe(listener: () => void): () => void {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	},
	navigate(url: string): void {
		const [pathname, search = ''] = url.split('?')
		this.pathname = pathname ?? '/'
		this.search = search
		window.history.replaceState(null, '', url)
		for (const listener of this.listeners) {
			listener()
		}
	},
	reset(pathname: string, search: string): void {
		this.pathname = pathname
		this.search = search
		window.history.replaceState(null, '', search ? `${pathname}?${search}` : pathname)
	},
}

vi.mock('next/navigation', () => ({
	useSearchParams: () =>
		new URLSearchParams(
			useSyncExternalStore(
				(l) => navStore.subscribe(l),
				() => navStore.search,
				() => navStore.search,
			),
		),
	usePathname: () =>
		useSyncExternalStore(
			(l) => navStore.subscribe(l),
			() => navStore.pathname,
			() => navStore.pathname,
		),
	useRouter: () => ({
		push: (url: string) => {
			navStore.navigate(url)
		},
		replace: (url: string) => {
			navStore.navigate(url)
		},
	}),
}))

// Imported after the mock so the adapter binds to the mocked `next/navigation`.
const { nextAdapter } = await import('./url/next')

const store = createContextStore<StoreApi<Filters>>(() =>
	pipe(
		createStore<Filters>()(() => ({ q: '' })),
		withPersist<StoreApi<Filters>>({
			fields: (field) => [field((state) => state.q, { source: 'url', parser: paramString() })],
		}),
	),
)

function View(): ReactElement {
	const q = store.useSelector((state) => state.q)
	const handle = store.useStore()
	return (
		<>
			<span data-testid='q'>{q}</span>
			<button
				type='button'
				onClick={() => {
					handle.setState({ q: 'boots' })
				}}
			>
				write
			</button>
		</>
	)
}

describe('@ez-kit/zu-store persist nextAdapter', () => {
	beforeEach(() => {
		navStore.listeners.clear()
		navStore.reset('/', '')
	})

	it('hydrates from the URL and writes store changes back to the router', async () => {
		navStore.reset('/', 'q=shoes')

		render(
			<StoreProvider persist={[nextAdapter]}>
				<store.Provider>
					<View />
				</store.Provider>
			</StoreProvider>,
		)

		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('shoes')
		})

		fireEvent.click(screen.getByRole('button', { name: 'write' }))
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('boots')
		})
		expect(navStore.search).toContain('q=boots')
	})

	it('pulls external URL changes (back/forward) into the store without re-writing', async () => {
		render(
			<StoreProvider persist={[nextAdapter]}>
				<store.Provider>
					<View />
				</store.Provider>
			</StoreProvider>,
		)

		navStore.navigate('/?q=sandals')
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('sandals')
		})
	})
})
