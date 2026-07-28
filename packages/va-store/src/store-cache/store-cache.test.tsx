import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { createStoreCache, MISSING_CACHE_PROVIDER } from './create-store-cache'

import type { StoreInit } from '../create-store'
import type { Snapshot } from 'valtio'

type FormState = {
	dirty: boolean
	name: string
}

type FormDefaultValue = { dirty?: boolean; name?: string }

/** Eviction window for tests that wait out `gcTime`. Short — the wait is real wall-clock time. */
const GC_TIME = 200
/** A multiple of gcTime, not a hair over it, so a loaded CI runner cannot race the eviction timer. */
const PAST_GC_TIME = GC_TIME * 2

const formFactory = ({ defaultValue }: StoreInit<FormDefaultValue>) =>
	proxy<FormState>({
		dirty: defaultValue.dirty ?? false,
		name: defaultValue.name ?? '',
	})

describe('valtio createStoreCache — surface', () => {
	it('returns the zu-store-equivalent shape', () => {
		const cache = createStoreCache()
		expect(typeof cache.Provider).toBe('function')
		expect(typeof cache.Scope).toBe('function')
		expect(typeof cache.useCache).toBe('function')
		expect(typeof cache.useCacheKeys).toBe('function')
		expect(typeof cache.createCachedStore).toBe('function')
	})

	it('reads selected state through useSnapshot and re-renders on mutation', async () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'surface-read' })

		function NameView() {
			const snap = form.useSnapshot()
			return <span data-testid='name'>{snap.name}</span>
		}
		function RenameButton() {
			const store = form.useStore()
			return (
				<button
					type='button'
					onClick={() => {
						store.name = 'Ann'
					}}
				>
					rename
				</button>
			)
		}

		render(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'seed' }}
				>
					<NameView />
					<RenameButton />
				</form.Provider>
			</cache.Provider>,
		)

		expect(screen.getByTestId('name')).toHaveTextContent('seed')
		fireEvent.click(screen.getByRole('button', { name: 'rename' }))
		await waitFor(() => {
			expect(screen.getByTestId('name')).toHaveTextContent('Ann')
		})
	})

	it('useSnapshot() reads the snapshot while useStore() hands back the raw proxy', () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'surface-semantics' })

		let snapshot: Snapshot<FormState> | undefined
		let raw: FormState | undefined
		function Probe() {
			snapshot = form.useSnapshot()
			raw = form.useStore()
			return null
		}

		render(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'seed' }}
				>
					<Probe />
				</form.Provider>
			</cache.Provider>,
		)

		// `useSnapshot()` yields the readonly snapshot — a distinct object from the live cached proxy that
		// `useStore()` returns. Under the old semantics `useStore()` handed back that same proxy.
		expect(raw).toBe(form.fromCache({ id: 'main' }))
		expect(snapshot).not.toBe(raw)
		expect(snapshot?.name).toBe('seed')
	})

	it('re-renders a useSnapshot() reader when the raw proxy is mutated elsewhere', async () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'surface-use-snapshot-reactivity' })

		function NameView() {
			return <span data-testid='name'>{form.useSnapshot().name}</span>
		}
		function RenameButton() {
			const store = form.useStore()
			return (
				<button
					type='button'
					onClick={() => {
						store.name = 'Ann'
					}}
				>
					rename
				</button>
			)
		}

		render(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'seed' }}
				>
					<NameView />
					<RenameButton />
				</form.Provider>
			</cache.Provider>,
		)

		expect(screen.getByTestId('name')).toHaveTextContent('seed')
		fireEvent.click(screen.getByRole('button', { name: 'rename' }))
		await waitFor(() => {
			expect(screen.getByTestId('name')).toHaveTextContent('Ann')
		})
	})

	it('exposes { snap, store } via the Item render-prop', () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'surface-item' })

		render(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'render-prop' }}
				>
					<form.Item>{({ snap }) => <span data-testid='item'>{snap.name}</span>}</form.Item>
				</form.Provider>
			</cache.Provider>,
		)

		expect(screen.getByTestId('item')).toHaveTextContent('render-prop')
	})
})

describe('valtio createStoreCache — StoreItem', () => {
	it('writes through the raw proxy without re-rendering its own child', async () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'store-item' })
		let storeItemRenders = 0

		render(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'seed' }}
				>
					<form.Item>{({ snap }) => <span data-testid='name'>{snap.name}</span>}</form.Item>
					<form.StoreItem>
						{(store) => {
							storeItemRenders += 1
							return (
								<button
									type='button'
									onClick={() => {
										store.name = 'Ann'
									}}
								>
									rename
								</button>
							)
						}}
					</form.StoreItem>
				</form.Provider>
			</cache.Provider>,
		)

		const rendersAfterMount = storeItemRenders

		expect(screen.getByTestId('name')).toHaveTextContent('seed')
		fireEvent.click(screen.getByRole('button', { name: 'rename' }))
		await waitFor(() => {
			expect(screen.getByTestId('name')).toHaveTextContent('Ann')
		})

		expect(storeItemRenders).toBe(rendersAfterMount)
	})
})

describe('valtio createStoreCache — cache-hit returns same live proxy', () => {
	it('preserves in-progress mutations across unmount/remount within gcTime', async () => {
		const cache = createStoreCache({ gcTime: 10_000 })
		const form = cache.createCachedStore(formFactory, { name: 'reuse-1' })

		function NameView() {
			const snap = form.useSnapshot()
			return <span data-testid='name'>{`${snap.name}:${String(snap.dirty)}`}</span>
		}
		function DirtyButton() {
			const store = form.useStore()
			return (
				<button
					type='button'
					onClick={() => {
						store.dirty = true
						store.name = 'Ann'
					}}
				>
					dirty
				</button>
			)
		}

		function App({ show }: { show: boolean }) {
			return (
				<cache.Provider>
					{show ? (
						<form.Provider
							id='form'
							defaultValue={{ name: '', dirty: false }}
						>
							<NameView />
							<DirtyButton />
						</form.Provider>
					) : (
						<span>hidden</span>
					)}
				</cache.Provider>
			)
		}

		const { rerender } = render(<App show={true} />)
		fireEvent.click(screen.getByRole('button', { name: 'dirty' }))
		await waitFor(() => {
			expect(screen.getByTestId('name')).toHaveTextContent('Ann:true')
		})

		// Unmount the form provider (cache.Provider stays mounted; entry kept alive within gcTime).
		rerender(<App show={false} />)
		expect(screen.queryByTestId('name')).toBeNull()

		// Remount with a different defaultValue — the preserved proxy must win.
		rerender(<App show={true} />)
		expect(screen.getByTestId('name')).toHaveTextContent('Ann:true')
	})

	it('ignores a different defaultValue on reuse and returns the same proxy', () => {
		const cache = createStoreCache({ gcTime: 10_000 })
		const form = cache.createCachedStore(formFactory, { name: 'reuse-2' })

		function NameView() {
			return <span data-testid='name'>{form.useSnapshot().name}</span>
		}
		function App({ show, seed }: { show: boolean; seed: string }) {
			return (
				<cache.Provider>
					{show ? (
						<form.Provider
							id='form'
							defaultValue={{ name: seed }}
						>
							<NameView />
						</form.Provider>
					) : null}
				</cache.Provider>
			)
		}

		const { rerender } = render(
			<App
				show={true}
				seed='first'
			/>,
		)
		expect(screen.getByTestId('name')).toHaveTextContent('first')
		const live = form.fromCache({ id: 'form' })

		rerender(
			<App
				show={false}
				seed='first'
			/>,
		)
		rerender(
			<App
				show={true}
				seed='second'
			/>,
		)

		expect(screen.getByTestId('name')).toHaveTextContent('first')
		expect(form.fromCache({ id: 'form' })).toBe(live)
	})

	it('seeds a fresh proxy from defaultValue after the entry is evicted', async () => {
		const cache = createStoreCache({ gcTime: GC_TIME })
		const form = cache.createCachedStore(formFactory, { name: 'reuse-evict' })

		function NameView() {
			return <span data-testid='name'>{form.useSnapshot().name}</span>
		}
		function App({ show, seed }: { show: boolean; seed: string }) {
			return (
				<cache.Provider>
					{show ? (
						<form.Provider
							id='form'
							defaultValue={{ name: seed }}
						>
							<NameView />
						</form.Provider>
					) : null}
				</cache.Provider>
			)
		}

		const { rerender } = render(
			<App
				show={true}
				seed='first'
			/>,
		)
		expect(screen.getByTestId('name')).toHaveTextContent('first')

		// Unmount the form provider, then wait past gcTime so the unobserved entry is evicted.
		rerender(
			<App
				show={false}
				seed='first'
			/>,
		)
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, PAST_GC_TIME))
		})
		expect(form.fromCache({ id: 'form' })).toBeUndefined()

		// Remount: the entry is gone, so the new defaultValue seeds a fresh proxy.
		rerender(
			<App
				show={true}
				seed='second'
			/>,
		)
		expect(screen.getByTestId('name')).toHaveTextContent('second')
	})
})

describe('valtio createStoreCache — useFromCache', () => {
	const NO_ENTRY = 'none'

	it('throws when used without a cache Provider', () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'from-cache-no-provider' })

		function Badge() {
			form.useFromCache({ id: 'main' }, (snap) => snap?.name)
			return null
		}

		expect(() => render(<Badge />)).toThrowError(MISSING_CACHE_PROVIDER)
	})

	it('passively reflects creation, mutation, and eviction of an entry at an address', async () => {
		const cache = createStoreCache({ gcTime: GC_TIME })
		const form = cache.createCachedStore(formFactory, { name: 'from-cache-passive' })

		function Badge() {
			const name = form.useFromCache({ path: ['page-1'], id: 'main' }, (snap) => snap?.name ?? NO_ENTRY)
			return <span data-testid='badge'>{name}</span>
		}
		function RenameButton() {
			const store = form.useStore()
			return (
				<button
					type='button'
					onClick={() => {
						store.name = 'Ann'
					}}
				>
					rename
				</button>
			)
		}
		function App({ show }: { show: boolean }) {
			return (
				<cache.Provider>
					<Badge />
					{show ? (
						<cache.Scope path={['page-1']}>
							<form.Provider
								id='main'
								defaultValue={{ name: 'seed' }}
							>
								<RenameButton />
							</form.Provider>
						</cache.Scope>
					) : null}
				</cache.Provider>
			)
		}

		// No live entry at the address yet — the selector receives `undefined`.
		const { rerender } = render(<App show={false} />)
		expect(screen.getByTestId('badge')).toHaveTextContent(NO_ENTRY)

		// Mounting the group Provider creates the entry; the passive reader picks it up.
		rerender(<App show={true} />)
		await waitFor(() => {
			expect(screen.getByTestId('badge')).toHaveTextContent('seed')
		})

		// Mutating the proxy from the owning tree re-renders the passive reader.
		fireEvent.click(screen.getByRole('button', { name: 'rename' }))
		await waitFor(() => {
			expect(screen.getByTestId('badge')).toHaveTextContent('Ann')
		})

		// Unmount and wait past gcTime: the entry is evicted and the reader falls back again.
		rerender(<App show={false} />)
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, PAST_GC_TIME))
		})
		await waitFor(() => {
			expect(screen.getByTestId('badge')).toHaveTextContent(NO_ENTRY)
		})
	})

	it('does not create an entry at the address it reads', () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'from-cache-passive-no-create' })

		function Badge() {
			const name = form.useFromCache({ id: 'main' }, (snap) => snap?.name ?? NO_ENTRY)
			return <span data-testid='badge'>{name}</span>
		}

		render(
			<cache.Provider>
				<Badge />
			</cache.Provider>,
		)

		expect(screen.getByTestId('badge')).toHaveTextContent(NO_ENTRY)
		expect(form.fromCache({ id: 'main' })).toBeUndefined()
	})
})

describe('valtio createStoreCache — SSR ephemerality', () => {
	it('renders seeded state on the server and exposes no live cache', () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'ssr-1' })

		function Reader() {
			return <span>{form.useSnapshot().name}</span>
		}

		const html = renderToString(
			<cache.Provider>
				<cache.Scope path={['page-1']}>
					<form.Provider
						id='main'
						defaultValue={{ name: 'server-seed' }}
					>
						<Reader />
					</form.Provider>
				</cache.Scope>
			</cache.Provider>,
		)

		expect(html).toContain('server-seed')
		expect(form.fromCache({ path: ['page-1'], id: 'main' })).toBeUndefined()
	})

	it('does not share state across separate server renders', () => {
		const cache = createStoreCache()
		const form = cache.createCachedStore(formFactory, { name: 'ssr-2' })

		function Reader() {
			return <span>{form.useSnapshot().name}</span>
		}

		const one = renderToString(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'first' }}
				>
					<Reader />
				</form.Provider>
			</cache.Provider>,
		)
		const two = renderToString(
			<cache.Provider>
				<form.Provider
					id='main'
					defaultValue={{ name: 'second' }}
				>
					<Reader />
				</form.Provider>
			</cache.Provider>,
		)

		expect(one).toContain('first')
		expect(two).toContain('second')
	})
})
