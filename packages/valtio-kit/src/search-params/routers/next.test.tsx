import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ReactElement, useSyncExternalStore } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { withSearchParamsFields } from '../accessor'
import { paramString } from '../codecs'
import { clearRegistry } from '../engine/registry'
import { StoreSearchParamsProvider } from '../provider'

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

describe('@ez-kit/valtio-kit nextAdapter', () => {
	beforeEach(() => {
		clearRegistry()
		navStore.listeners.clear()
		navStore.reset('/', '')
	})

	it('hydrates from the URL and writes proxy changes back to the router', async () => {
		navStore.reset('/', 'q=shoes')
		const store = withSearchParamsFields(proxy({ q: '' }), (field) => [field((s) => s.q, paramString())])

		function View(): ReactElement {
			const snap = useSnapshot(store)
			return (
				<>
					<span data-testid='q'>{snap.q}</span>
					<button
						type='button'
						onClick={() => (store.q = 'boots')}
					>
						write
					</button>
				</>
			)
		}

		render(
			<StoreSearchParamsProvider adapter={nextAdapter}>
				<View />
			</StoreSearchParamsProvider>,
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
		const store = withSearchParamsFields(proxy({ q: '' }), (field) => [field((s) => s.q, paramString())])

		function View(): ReactElement {
			const snap = useSnapshot(store)
			return <span data-testid='q'>{snap.q}</span>
		}

		render(
			<StoreSearchParamsProvider adapter={nextAdapter}>
				<View />
			</StoreSearchParamsProvider>,
		)

		navStore.navigate('/?q=sandals')
		await waitFor(() => {
			expect(screen.getByTestId('q')).toHaveTextContent('sandals')
		})
	})
})
