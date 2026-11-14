import { act, renderHook } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { MemoryRouter, useNavigate } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { reactRouterAdapter } from './react-router'

import type { CommitCtx, Keyed } from '../types'
import type { ReactNode } from 'react'

const navigation = {
	search: 'utm_source=mail',
	urls: [] as string[],
	listeners: new Set<() => void>(),
}

vi.mock('next/navigation', () => ({
	useSearchParams: () =>
		new URLSearchParams(
			useSyncExternalStore(
				(listener) => {
					navigation.listeners.add(listener)
					return () => {
						navigation.listeners.delete(listener)
					}
				},
				() => navigation.search,
				() => navigation.search,
			),
		),
	usePathname: () => '/',
	useRouter: () => ({
		replace: (url: string) => {
			navigation.urls.push(url)
		},
		push: (url: string) => {
			navigation.urls.push(url)
		},
	}),
}))

const { nextAdapter } = await import('./next')
const context = (key: string): CommitCtx => ({ fields: [], diff: { set: [key], removed: [] }, meta: {} })

afterEach(() => {
	navigation.search = 'utm_source=mail'
	navigation.urls = []
	navigation.listeners.clear()
	window.history.replaceState(null, '', '/')
})

describe('URL driver navigation ownership', () => {
	it('keeps successive Next patches while search params lag and accepts intermediate acknowledgements', async () => {
		const view = renderHook(() => nextAdapter.usePort())
		const port = view.result.current.port
		port.set(new Map([['q', 'boots']]), context('q'))
		port.set(new Map([['page', '2']]), context('page'))
		expect(navigation.urls).toEqual(['/?utm_source=mail&q=boots', '/?utm_source=mail&q=boots&page=2'])
		await act(async () => {
			navigation.search = 'utm_source=mail&q=boots'
			for (const listener of [...navigation.listeners]) listener()
			await Promise.resolve()
		})
		expect(port.get().get('page')).toBe('2')
		port.set(new Map([['sort', 'asc']]), context('sort'))
		expect(navigation.urls.at(-1)).toBe('/?utm_source=mail&q=boots&page=2&sort=asc')
	})

	it('Next popstate discards pending intent before reading the restored native URL', () => {
		const view = renderHook(() => nextAdapter.usePort())
		const port = view.result.current.port
		let observed: Keyed | undefined
		const unsubscribe = port.subscribe?.(() => {
			observed = port.get()
		})
		port.set(new Map([['q', 'older']]), context('q'))
		port.set(new Map([['q', 'newer']]), context('q'))
		window.history.replaceState(null, '', '/?utm_source=mail&q=older')
		window.dispatchEvent(new PopStateEvent('popstate'))
		expect(observed?.get('q')).toBe('older')
		expect(observed?.get('utm_source')).toBe('mail')
		unsubscribe?.()
	})

	it('React Router notifies POP even when the restored history entry has the same query', async () => {
		function Wrapper({ children }: { children: ReactNode }) {
			return (
				<MemoryRouter
					initialEntries={['/?q=same', '/?q=same']}
					initialIndex={1}
				>
					{children}
				</MemoryRouter>
			)
		}
		const view = renderHook(() => ({ adapter: reactRouterAdapter.usePort(), navigate: useNavigate() }), {
			wrapper: Wrapper,
		})
		const onNavigate = vi.fn()
		const unsubscribe = view.result.current.adapter.port.subscribe?.(onNavigate)
		await act(async () => {
			await view.result.current.navigate(-1)
		})
		expect(onNavigate).toHaveBeenCalledTimes(1)
		expect(view.result.current.adapter.port.get().get('q')).toBe('same')
		unsubscribe?.()
	})
})
