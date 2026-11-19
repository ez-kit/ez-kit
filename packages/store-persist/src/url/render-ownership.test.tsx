import { act, render, screen } from '@testing-library/react'
import { createContext, startTransition, Suspense, useContext, useLayoutEffect, useState } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { reactRouterAdapter } from './react-router'

import type { SyncReadSourcePort } from '../types'

const RouteContext = createContext({ pathname: '/old', search: 'q=old' })
const commits: string[] = []
const router = {
	replace: (url: string) => {
		commits.push(url)
	},
	push: (url: string) => {
		commits.push(url)
	},
}
vi.mock('next/navigation', () => ({
	useSearchParams: () => new URLSearchParams(useContext(RouteContext).search),
	usePathname: () => useContext(RouteContext).pathname,
	useRouter: () => router,
}))
const { nextAdapter } = await import('./next')
const pending = new Promise<never>(() => undefined)
const patch = { fields: [], diff: { set: ['page'], removed: [] }, meta: {} }

describe('render seed and committed URL ownership', () => {
	it('Next seeds the suspended render without exposing it to operational reads or writes', async () => {
		let port: SyncReadSourcePort | undefined
		let change: ((route: { pathname: string; search: string }) => void) | undefined
		let seeded: string | undefined
		function View() {
			port = nextAdapter.usePort().port
			if (useContext(RouteContext).pathname === '/new') {
				seeded = port.getRenderSnapshot?.().get('q')
				// eslint-disable-next-line @typescript-eslint/only-throw-error -- React Suspense probe.
				throw pending
			}
			return <span>old screen</span>
		}
		function App() {
			const [route, setRoute] = useState({ pathname: '/old', search: 'q=old' })
			change = setRoute
			return (
				<Suspense fallback='loading'>
					<RouteContext.Provider value={route}>
						<View />
					</RouteContext.Provider>
				</Suspense>
			)
		}
		const view = render(<App />)
		await act(async () => {
			startTransition(() => change?.({ pathname: '/new', search: 'q=new' }))
			await Promise.resolve()
		})
		expect(screen.getByText('old screen')).toBeInTheDocument()
		expect(seeded).toBe('new')
		expect(port?.get().get('q')).toBe('old')
		void port?.set(new Map([['page', '2']]), patch)
		expect(commits.at(-1)).toBe('/old?q=old&page=2')
		view.unmount()
	})

	it('React Router keeps active reads and writes on the committed route during Suspense', async () => {
		let port: SyncReadSourcePort | undefined
		let navigate: ReturnType<typeof useNavigate> | undefined
		let seeded: string | undefined
		let committed = ''
		function View() {
			port = reactRouterAdapter.usePort().port
			const location = useLocation()
			navigate = useNavigate()
			useLayoutEffect(() => {
				committed = location.pathname + location.search
			}, [location])
			if (location.pathname === '/new') {
				seeded = port.getRenderSnapshot?.().get('q')
				// eslint-disable-next-line @typescript-eslint/only-throw-error -- React Suspense probe.
				throw pending
			}
			return <span>old router screen</span>
		}
		const view = render(
			<MemoryRouter initialEntries={['/old?q=old']}>
				<Suspense fallback='loading'>
					<View />
				</Suspense>
			</MemoryRouter>,
		)
		await act(async () => {
			startTransition(() => {
				void navigate?.('/new?q=new')
			})
			await Promise.resolve()
		})
		expect(screen.getByText('old router screen')).toBeInTheDocument()
		expect(committed).toBe('/old?q=old')
		expect(seeded).toBe('new')
		expect(port?.get().get('q')).toBe('old')
		await act(async () => {
			await port?.set(new Map([['page', '2']]), patch)
		})
		expect(committed).toBe('/old?q=old&page=2')
		view.unmount()
	})
})
