import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'

import { toTree } from './cache'
import { createStoreCache } from './create-store-cache'

import type { StoreCacheController } from './types'

type TableState = {
	filter: string
	page: number
	setFilter: (filter: string) => void
	setPage: (page: number) => void
}

type TableDefaultProps = { filter?: string; page?: number }

const tableFactory = (defaultProps: TableDefaultProps) =>
	createStore<TableState>((set) => ({
		filter: defaultProps.filter ?? 'all',
		page: defaultProps.page ?? 1,
		setFilter: (filter) => {
			set({ filter })
		},
		setPage: (page) => {
			set({ page })
		},
	}))

describe('createStoreCache — provider & context', () => {
	it('isolates state between two separate cache.Provider trees', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)

		function Reader({ id }: { id: string }) {
			const filter = table.useStore((s) => s.filter)
			return <span data-testid={id}>{filter}</span>
		}
		function SetButton() {
			const setFilter = table.useStore((s) => s.setFilter)
			return (
				<button
					type='button'
					onClick={() => {
						setFilter('changed')
					}}
				>
					set
				</button>
			)
		}

		render(
			<>
				<cache.Provider>
					<table.Provider
						cacheKey='main'
						defaultProps={{ filter: 'seed' }}
					>
						<Reader id='one' />
						<SetButton />
					</table.Provider>
				</cache.Provider>
				<cache.Provider>
					<table.Provider
						cacheKey='main'
						defaultProps={{ filter: 'seed' }}
					>
						<Reader id='two' />
					</table.Provider>
				</cache.Provider>
			</>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'set' }))

		expect(screen.getByTestId('one')).toHaveTextContent('changed')
		expect(screen.getByTestId('two')).toHaveTextContent('seed')
	})

	it('throws when a family Provider is used without a cache Provider', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		function Consumer() {
			table.useStore((s) => s.filter)
			return null
		}
		expect(() => render(<table.Provider cacheKey='x'>{<Consumer />}</table.Provider>)).toThrowError(
			'Missing StoreCacheProvider',
		)
	})

	it('throws when useFromCache is used without a cache Provider', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		function Badge() {
			table.useFromCache({ key: 'x' }, (s) => s?.filter)
			return null
		}
		expect(() => render(<Badge />)).toThrowError('Missing StoreCacheProvider')
	})
})

describe('createStoreCache — namespacing & seeding', () => {
	it('keeps the same cacheKey independent across families', () => {
		const cache = createStoreCache()
		const users = cache.defineStore('users', tableFactory)
		const orders = cache.defineStore('orders', tableFactory)

		render(
			<cache.Provider>
				<users.Provider cacheKey='main'>
					<span />
				</users.Provider>
				<orders.Provider cacheKey='main'>
					<span />
				</orders.Provider>
			</cache.Provider>,
		)

		expect(users.fromCache({ key: 'main' })).toBeDefined()
		expect(orders.fromCache({ key: 'main' })).toBeDefined()
		expect(users.fromCache({ key: 'main' })).not.toBe(orders.fromCache({ key: 'main' }))
	})

	it('seeds the store from defaultProps on first mount', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		function Reader() {
			return <span data-testid='r'>{table.useStore((s) => s.filter)}</span>
		}

		render(
			<cache.Provider>
				<table.Provider
					cacheKey='main'
					defaultProps={{ filter: 'active' }}
				>
					<Reader />
				</table.Provider>
			</cache.Provider>,
		)

		expect(screen.getByTestId('r')).toHaveTextContent('active')
	})
})

describe('createStoreCache — path namespacing via Scope', () => {
	it('concatenates nested Scope paths into the resolved identity', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		const controllers: StoreCacheController[] = []
		function Probe() {
			controllers.push(cache.useCache())
			return null
		}

		render(
			<cache.Provider>
				<cache.Scope path={['page-1']}>
					<cache.Scope path={['section-1']}>
						<table.Provider cacheKey='user-42'>
							<span />
						</table.Provider>
					</cache.Scope>
				</cache.Scope>
				<Probe />
			</cache.Provider>,
		)

		// Read at assertion time (after effects publish the entry), via the captured controller.
		const controller = controllers.at(-1)
		expect(controller?.keys()).toContainEqual({ path: ['page-1', 'section-1'], group: 'table', key: 'user-42' })
		expect(toTree(controller?.keys() ?? [])).toEqual({ 'page-1': { 'section-1': { table: ['user-42'] } } })
		expect(table.fromCache({ path: ['page-1', 'section-1'], key: 'user-42' })).toBeDefined()
	})

	it('defaults to the root path when no Scope encloses the Provider', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)

		render(
			<cache.Provider>
				<table.Provider cacheKey='user-42'>
					<span />
				</table.Provider>
			</cache.Provider>,
		)

		expect(table.fromCache({ path: [], key: 'user-42' })).toBeDefined()
		expect(table.fromCache({ key: 'user-42' })).toBeDefined()
	})

	it('does not collide when the same group + cacheKey mounts under different paths', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)

		function UserTable({ id }: { id: string }) {
			const filter = table.useStore((s) => s.filter)
			const setFilter = table.useStore((s) => s.setFilter)
			return (
				<button
					type='button'
					data-testid={id}
					onClick={() => {
						setFilter('archived')
					}}
				>
					{filter}
				</button>
			)
		}

		render(
			<cache.Provider>
				<cache.Scope path={['page-1']}>
					<table.Provider cacheKey='user-42'>
						<UserTable id='one' />
					</table.Provider>
				</cache.Scope>
				<cache.Scope path={['page-2']}>
					<table.Provider cacheKey='user-42'>
						<UserTable id='two' />
					</table.Provider>
				</cache.Scope>
			</cache.Provider>,
		)

		fireEvent.click(screen.getByTestId('one'))

		expect(screen.getByTestId('one')).toHaveTextContent('archived')
		expect(screen.getByTestId('two')).toHaveTextContent('all')
		expect(table.fromCache({ path: ['page-1'], key: 'user-42' })).not.toBe(
			table.fromCache({ path: ['page-2'], key: 'user-42' }),
		)
	})

	it('appends the Provider path prop after the inherited scope', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)

		render(
			<cache.Provider>
				<cache.Scope path={['page-1']}>
					<table.Provider
						cacheKey='row-1'
						path={['detail']}
					>
						<span />
					</table.Provider>
				</cache.Scope>
			</cache.Provider>,
		)

		expect(table.fromCache({ path: ['page-1', 'detail'], key: 'row-1' })).toBeDefined()
		expect(table.fromCache({ path: ['page-1'], key: 'row-1' })).toBeUndefined()
	})

	it('re-resolves the store when the enclosing scope path changes', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		function FilterView() {
			return <span data-testid='r'>{table.useStore((s) => s.filter)}</span>
		}
		function ArchiveButton() {
			const setFilter = table.useStore((s) => s.setFilter)
			return (
				<button
					type='button'
					onClick={() => {
						setFilter('archived')
					}}
				>
					archive
				</button>
			)
		}
		function App({ page }: { page: string }) {
			return (
				<cache.Provider>
					<cache.Scope path={[page]}>
						<table.Provider
							cacheKey='main'
							defaultProps={{ filter: page }}
						>
							<FilterView />
							<ArchiveButton />
						</table.Provider>
					</cache.Scope>
				</cache.Provider>
			)
		}

		const { rerender } = render(<App page='page-1' />)
		fireEvent.click(screen.getByRole('button', { name: 'archive' }))
		expect(screen.getByTestId('r')).toHaveTextContent('archived')

		rerender(<App page='page-2' />)
		expect(screen.getByTestId('r')).toHaveTextContent('page-2')

		rerender(<App page='page-1' />)
		expect(screen.getByTestId('r')).toHaveTextContent('archived')
	})
})

describe('createStoreCache — keep-alive', () => {
	it('preserves state across Provider unmount/remount and ignores defaultProps on reuse', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)

		function FilterView() {
			return <span data-testid='r'>{table.useStore((s) => s.filter)}</span>
		}
		function ArchiveButton() {
			const setFilter = table.useStore((s) => s.setFilter)
			return (
				<button
					type='button'
					onClick={() => {
						setFilter('archived')
					}}
				>
					archive
				</button>
			)
		}
		function App({ show, seed }: { show: boolean; seed: string }) {
			return (
				<cache.Provider>
					{show ? (
						<table.Provider
							cacheKey='main'
							defaultProps={{ filter: seed }}
						>
							<FilterView />
							<ArchiveButton />
						</table.Provider>
					) : (
						<span data-testid='hidden'>hidden</span>
					)}
				</cache.Provider>
			)
		}

		const { rerender } = render(
			<App
				show
				seed='active'
			/>,
		)
		expect(screen.getByTestId('r')).toHaveTextContent('active')

		fireEvent.click(screen.getByRole('button', { name: 'archive' }))
		expect(screen.getByTestId('r')).toHaveTextContent('archived')

		rerender(
			<App
				show={false}
				seed='active'
			/>,
		)
		rerender(
			<App
				show
				seed='ignored-on-reuse'
			/>,
		)

		expect(screen.getByTestId('r')).toHaveTextContent('archived')
	})

	it('shares one store between concurrent Providers with the same identity', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		function FilterView({ id }: { id: string }) {
			return <span data-testid={id}>{table.useStore((s) => s.filter)}</span>
		}
		function ArchiveButton() {
			const setFilter = table.useStore((s) => s.setFilter)
			return (
				<button
					type='button'
					onClick={() => {
						setFilter('archived')
					}}
				>
					archive
				</button>
			)
		}

		render(
			<cache.Provider>
				<table.Provider cacheKey='main'>
					<FilterView id='one' />
				</table.Provider>
				<table.Provider cacheKey='main'>
					<FilterView id='two' />
					<ArchiveButton />
				</table.Provider>
			</cache.Provider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'archive' }))
		expect(screen.getByTestId('one')).toHaveTextContent('archived')
		expect(screen.getByTestId('two')).toHaveTextContent('archived')
	})

	it('re-resolves the store when cacheKey changes and reuses prior keys', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		function FilterView() {
			return <span data-testid='r'>{table.useStore((s) => s.filter)}</span>
		}
		function ArchiveButton() {
			const setFilter = table.useStore((s) => s.setFilter)
			return (
				<button
					type='button'
					onClick={() => {
						setFilter('archived')
					}}
				>
					archive
				</button>
			)
		}
		function App({ k }: { k: string }) {
			return (
				<cache.Provider>
					<table.Provider
						cacheKey={k}
						defaultProps={{ filter: k }}
					>
						<FilterView />
						<ArchiveButton />
					</table.Provider>
				</cache.Provider>
			)
		}

		const { rerender } = render(<App k='a' />)
		fireEvent.click(screen.getByRole('button', { name: 'archive' }))
		expect(screen.getByTestId('r')).toHaveTextContent('archived')

		rerender(<App k='b' />)
		expect(screen.getByTestId('r')).toHaveTextContent('b')

		rerender(<App k='a' />)
		expect(screen.getByTestId('r')).toHaveTextContent('archived')
	})
})

describe('createStoreCache — gc lifecycle', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('evicts after gcTime once the last Provider unmounts', () => {
		vi.useFakeTimers()
		const cache = createStoreCache({ gcTime: 1000 })
		const table = cache.defineStore('table', tableFactory)
		function App({ show }: { show: boolean }) {
			return (
				<cache.Provider>
					{show ? (
						<table.Provider cacheKey='main'>
							<span />
						</table.Provider>
					) : null}
				</cache.Provider>
			)
		}

		const { rerender } = render(<App show />)
		expect(table.fromCache({ key: 'main' })).toBeDefined()

		rerender(<App show={false} />)
		act(() => {
			vi.advanceTimersByTime(1001)
		})
		expect(table.fromCache({ key: 'main' })).toBeUndefined()
	})

	it('fixes gcTime birth-config from the first mounting Provider', () => {
		vi.useFakeTimers()
		const cache = createStoreCache({ gcTime: 50_000 })
		const table = cache.defineStore('table', tableFactory)
		function App({ a, b }: { a: boolean; b: boolean }) {
			return (
				<cache.Provider>
					{a ? (
						<table.Provider
							cacheKey='main'
							gcTime={1000}
						>
							<span />
						</table.Provider>
					) : null}
					{b ? (
						<table.Provider
							cacheKey='main'
							gcTime={60_000}
						>
							<span />
						</table.Provider>
					) : null}
				</cache.Provider>
			)
		}

		const { rerender } = render(
			<App
				a
				b
			/>,
		)
		rerender(
			<App
				a={false}
				b
			/>,
		)
		rerender(
			<App
				a={false}
				b={false}
			/>,
		)

		act(() => {
			vi.advanceTimersByTime(1001)
		})
		expect(table.fromCache({ key: 'main' })).toBeUndefined()
	})

	it('keeps an alwaysCache entry alive after all Providers unmount', () => {
		vi.useFakeTimers()
		const cache = createStoreCache({ gcTime: 1000 })
		const table = cache.defineStore('table', tableFactory)
		function App({ show }: { show: boolean }) {
			return (
				<cache.Provider>
					{show ? (
						<table.Provider
							cacheKey='main'
							alwaysCache
						>
							<span />
						</table.Provider>
					) : null}
				</cache.Provider>
			)
		}

		const { rerender } = render(<App show />)
		rerender(<App show={false} />)
		act(() => {
			vi.advanceTimersByTime(100_000)
		})
		expect(table.fromCache({ key: 'main' })).toBeDefined()
	})
})

describe('createStoreCache — imperative & reactive access', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('fromCache imperatively updates a live store at a path and re-renders subscribers', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		function PageView() {
			return <span data-testid='p'>{table.useStore((s) => s.page)}</span>
		}

		render(
			<cache.Provider>
				<cache.Scope path={['page-1']}>
					<table.Provider cacheKey='main'>
						<PageView />
					</table.Provider>
				</cache.Scope>
			</cache.Provider>,
		)

		expect(screen.getByTestId('p')).toHaveTextContent('1')
		act(() => {
			table.fromCache({ path: ['page-1'], key: 'main' })?.setState({ page: 2 })
		})
		expect(screen.getByTestId('p')).toHaveTextContent('2')
		// Root address misses the page-1 entry.
		expect(table.fromCache({ key: 'main' })).toBeUndefined()
	})

	it('fromCache returns undefined for a missing key without creating it', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		render(
			<cache.Provider>
				<span />
			</cache.Provider>,
		)
		expect(table.fromCache({ key: 'ghost' })).toBeUndefined()
	})

	it('useFromCache passively reflects creation, updates, and eviction at a path', () => {
		vi.useFakeTimers()
		const cache = createStoreCache({ gcTime: 1000 })
		const table = cache.defineStore('table', tableFactory)

		function Badge() {
			const filter = table.useFromCache({ path: ['page-1'], key: 'main' }, (s) => s?.filter ?? 'none')
			return <span data-testid='badge'>{filter}</span>
		}
		function ArchiveButton() {
			const setFilter = table.useStore((s) => s.setFilter)
			return (
				<button
					type='button'
					onClick={() => {
						setFilter('archived')
					}}
				>
					archive
				</button>
			)
		}
		function App({ show }: { show: boolean }) {
			return (
				<cache.Provider>
					<Badge />
					{show ? (
						<cache.Scope path={['page-1']}>
							<table.Provider
								cacheKey='main'
								defaultProps={{ filter: 'active' }}
							>
								<ArchiveButton />
							</table.Provider>
						</cache.Scope>
					) : null}
				</cache.Provider>
			)
		}

		const { rerender } = render(<App show={false} />)
		expect(screen.getByTestId('badge')).toHaveTextContent('none')

		rerender(<App show />)
		expect(screen.getByTestId('badge')).toHaveTextContent('active')

		fireEvent.click(screen.getByRole('button', { name: 'archive' }))
		expect(screen.getByTestId('badge')).toHaveTextContent('archived')

		rerender(<App show={false} />)
		act(() => {
			vi.advanceTimersByTime(1001)
		})
		expect(screen.getByTestId('badge')).toHaveTextContent('none')
	})

	it('remove deletes a single entry and clear(prefix) removes a subtree across groups', () => {
		const cache = createStoreCache()
		const users = cache.defineStore('users', tableFactory)
		const orders = cache.defineStore('orders', tableFactory)
		function ClearPage1() {
			const { clear } = cache.useCache()
			return (
				<button
					type='button'
					onClick={() => {
						clear(['page-1'])
					}}
				>
					clear-page-1
				</button>
			)
		}

		render(
			<cache.Provider>
				<cache.Scope path={['page-1']}>
					<users.Provider cacheKey='main'>
						<span />
					</users.Provider>
					<orders.Provider cacheKey='main'>
						<span />
					</orders.Provider>
				</cache.Scope>
				<cache.Scope path={['page-2']}>
					<users.Provider cacheKey='main'>
						<span />
					</users.Provider>
				</cache.Scope>
				<ClearPage1 />
			</cache.Provider>,
		)

		act(() => {
			users.remove({ path: ['page-1'], key: 'main' })
		})
		expect(users.fromCache({ path: ['page-1'], key: 'main' })).toBeUndefined()
		expect(orders.fromCache({ path: ['page-1'], key: 'main' })).toBeDefined()
		expect(users.fromCache({ path: ['page-2'], key: 'main' })).toBeDefined()

		fireEvent.click(screen.getByRole('button', { name: 'clear-page-1' }))
		expect(orders.fromCache({ path: ['page-1'], key: 'main' })).toBeUndefined()
		expect(users.fromCache({ path: ['page-2'], key: 'main' })).toBeDefined()
	})
})

describe('createStoreCache — StrictMode & SSR', () => {
	it('preserves keep-alive under StrictMode double-invocation', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		function FilterView() {
			return <span data-testid='r'>{table.useStore((s) => s.filter)}</span>
		}
		function ArchiveButton() {
			const setFilter = table.useStore((s) => s.setFilter)
			return (
				<button
					type='button'
					onClick={() => {
						setFilter('archived')
					}}
				>
					archive
				</button>
			)
		}
		function App({ show }: { show: boolean }) {
			return (
				<StrictMode>
					<cache.Provider>
						{show ? (
							<table.Provider
								cacheKey='main'
								defaultProps={{ filter: 'active' }}
							>
								<FilterView />
								<ArchiveButton />
							</table.Provider>
						) : null}
					</cache.Provider>
				</StrictMode>
			)
		}

		const { rerender } = render(<App show />)
		fireEvent.click(screen.getByRole('button', { name: 'archive' }))
		expect(screen.getByTestId('r')).toHaveTextContent('archived')

		rerender(<App show={false} />)
		rerender(<App show />)
		expect(screen.getByTestId('r')).toHaveTextContent('archived')
	})

	it('renders seeded state on the server under a Scope and exposes no live cache', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		function Reader() {
			return <span>{table.useStore((s) => s.filter)}</span>
		}

		const html = renderToString(
			<cache.Provider>
				<cache.Scope path={['page-1']}>
					<table.Provider
						cacheKey='main'
						defaultProps={{ filter: 'active' }}
					>
						<Reader />
					</table.Provider>
				</cache.Scope>
			</cache.Provider>,
		)

		expect(html).toContain('active')
		// No effects run during SSR → nothing is published or marked active.
		expect(table.fromCache({ path: ['page-1'], key: 'main' })).toBeUndefined()
	})

	it('does not share state across separate server renders', () => {
		const cache = createStoreCache()
		const table = cache.defineStore('table', tableFactory)
		function Reader() {
			return <span>{table.useStore((s) => s.filter)}</span>
		}
		const one = renderToString(
			<cache.Provider>
				<table.Provider
					cacheKey='main'
					defaultProps={{ filter: 'first' }}
				>
					<Reader />
				</table.Provider>
			</cache.Provider>,
		)
		const two = renderToString(
			<cache.Provider>
				<table.Provider
					cacheKey='main'
					defaultProps={{ filter: 'second' }}
				>
					<Reader />
				</table.Provider>
			</cache.Provider>,
		)
		expect(one).toContain('first')
		expect(two).toContain('second')
	})
})
