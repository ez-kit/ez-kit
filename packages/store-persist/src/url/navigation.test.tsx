import { act, renderHook } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { reactRouterAdapter } from './react-router'

import type { CommitCtx, Keyed } from '../types'
import type { ReactNode } from 'react'

const navigation = {
	search: 'utm_source=mail',
	pathname: '/',
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
	usePathname: () => navigation.pathname,
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
	navigation.pathname = '/'
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

	it('Next preserves fragments and drops prior-path pending intent on pathname navigation', () => {
		window.history.replaceState(null, '', '/?utm_source=mail#details')
		const view = renderHook(() => nextAdapter.usePort())
		const port = view.result.current.port
		const unsubscribe = port.subscribe?.(() => undefined)
		port.set(new Map([['q', 'older']]), context('q'))
		port.set(new Map([['q', 'newer']]), context('q'))
		expect(navigation.urls.at(-1)).toBe('/?utm_source=mail&q=newer#details')
		navigation.pathname = '/other'
		navigation.search = 'utm_source=mail&q=older'
		view.rerender()
		expect(port.get().get('q')).toBe('older')
		port.set(new Map([['page', '2']]), context('page'))
		expect(navigation.urls.at(-1)).toBe('/other?utm_source=mail&q=older&page=2#details')
		unsubscribe?.()
	})

	it('React Router preserves fragments, foreign params and application object state on own acknowledgements', () => {
		function Wrapper({ children }: { children: ReactNode }) {
			return (
				<MemoryRouter
					initialEntries={[
						{ pathname: '/page', search: '?foreign=keep', hash: '#details', state: { selected: 'tab' } },
					]}
				>
					{children}
				</MemoryRouter>
			)
		}
		const view = renderHook(() => ({ adapter: reactRouterAdapter.usePort(), location: useLocation() }), {
			wrapper: Wrapper,
		})
		const port = view.result.current.adapter.port
		const onNavigate = vi.fn()
		const unsubscribe = port.subscribe?.(onNavigate)
		act(() => {
			port.set(new Map([['q', 'older']]), context('q'))
		})
		expect(view.result.current.location.hash).toBe('#details')
		expect(view.result.current.location.state).toMatchObject({ selected: 'tab' })
		expect(port.get().get('q')).toBe('older')
		act(() => {
			port.set(new Map([['q', 'newer']]), context('q'))
		})
		expect(port.get().get('q')).toBe('newer')
		expect(port.get().get('foreign')).toBe('keep')
		expect(onNavigate).not.toHaveBeenCalled()
		unsubscribe?.()
	})

	it.each([
		{ replace: false, pathname: '/page' },
		{ replace: true, pathname: '/page' },
		{ replace: false, pathname: '/other' },
		{ replace: true, pathname: '/other' },
	])(
		'React Router external navigation to a pending query cancels newer intent ($pathname, replace=$replace)',
		async ({ replace, pathname }) => {
			function Wrapper({ children }: { children: ReactNode }) {
				return <MemoryRouter initialEntries={['/page?foreign=keep#details']}>{children}</MemoryRouter>
			}
			const view = renderHook(
				() => ({ adapter: reactRouterAdapter.usePort(), location: useLocation(), navigate: useNavigate() }),
				{ wrapper: Wrapper },
			)
			const port = view.result.current.adapter.port
			const onNavigate = vi.fn()
			const unsubscribe = port.subscribe?.(onNavigate)
			await act(async () => {
				port.set(new Map([['q', 'older']]), context('q'))
				port.set(new Map([['q', 'newer']]), context('q'))
				await view.result.current.navigate(`${pathname}?foreign=keep&q=older#details`, { replace })
			})
			expect(view.result.current.location.pathname).toBe(pathname)
			expect(view.result.current.location.search).toBe('?foreign=keep&q=older')
			expect(port.get().get('q')).toBe('older')
			expect(onNavigate).toHaveBeenCalledTimes(1)
			act(() => {
				port.set(new Map([['page', '2']]), context('page'))
			})
			expect(view.result.current.location.search).toBe('?foreign=keep&q=older&page=2')
			expect(view.result.current.location.hash).toBe('#details')
			unsubscribe?.()
		},
	)

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
