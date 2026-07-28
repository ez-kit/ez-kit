import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ReactElement, useSyncExternalStore } from 'react'
import { proxy } from 'valtio'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createStore } from '../../create-store'
import { StoreProvider } from '../../store-provider'
import { paramString } from '../codecs'
import { persist } from '../plugin'

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
const { nextAdapter } = await import('./next')

const store = createStore<{ q: string }>(() => proxy({ q: '' }), {
	plugins: [persist({ fields: (field) => [field((s) => s.q, { source: 'url', parser: paramString() })] })],
})

function View(): ReactElement {
	const snap = store.useSnapshot()
	const state = store.useStore()
	return (
		<>
			<span data-testid='q'>{snap.q}</span>
			<button
				type='button'
				onClick={() => {
					// valtio's API is to mutate the proxy directly; that's the intended write path.
					// eslint-disable-next-line react-hooks/immutability
					state.q = 'boots'
				}}
			>
				write
			</button>
		</>
	)
}

describe('@ez-kit/va-store persist nextAdapter', () => {
	beforeEach(() => {
		navStore.listeners.clear()
		navStore.reset('/', '')
	})

	it('hydrates from the URL and writes proxy changes back to the router', async () => {
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

	it('pulls external URL changes (back/forward) into the proxy without re-writing', async () => {
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
