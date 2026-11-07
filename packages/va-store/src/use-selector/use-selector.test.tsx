import { act, render, renderHook, screen } from '@testing-library/react'
import { StrictMode, type PropsWithChildren } from 'react'
import { renderToString } from 'react-dom/server'
import { proxy } from 'valtio'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createContextStore, createStoreCache, shallowEqual, useSelector } from '../index'

async function mutate(write: () => void): Promise<void> {
	await act(async () => {
		write()
		await Promise.resolve()
	})
}

describe('useSelector', () => {
	it('skips changes when a derived result stays equal, including changes to read fields', async () => {
		const store = proxy({ count: 1, other: 0 })
		let renders = 0
		const { result } = renderHook(() => {
			renders++
			return useSelector(store, (s) => s.count > 0)
		})
		const initial = renders
		await mutate(() => {
			store.count = 2
			store.other++
		})
		expect(renders).toBe(initial)
		await mutate(() => {
			store.count = 0
		})
		expect(result.current).toBe(false)
		expect(renders).toBe(initial + 1)
	})

	it('caches fresh results per snapshot and retains equal references across inline selectors', async () => {
		const store = proxy({ count: 1, other: 0 })
		let renders = 0
		const { result, rerender } = renderHook(
			() => {
				renders++
				return useSelector(store, (s) => ({ count: s.count }), { isEqual: shallowEqual })
			},
			{ wrapper: StrictMode },
		)
		const initial = result.current
		const initialRenders = renders
		await mutate(() => {
			store.other++
		})
		expect(renders).toBe(initialRenders)
		rerender()
		expect(result.current).toBe(initial)
		await mutate(() => {
			store.count++
		})
		expect(result.current).toEqual({ count: 2 })
		expect(result.current).not.toBe(initial)
	})

	it('supports allocating selectors with default equality and nested snapshot updates', async () => {
		const store = proxy({ user: { name: 'one' }, other: 0 })
		const { result } = renderHook(() => useSelector(store, (s) => ({ user: s.user })))
		const initial = result.current
		await mutate(() => {
			store.user.name = 'two'
		})
		expect(result.current.user.name).toBe('two')
		expect(initial.user.name).toBe('one')
	})

	it('updates captured props and resubscribes when the proxy changes', async () => {
		const first = proxy({ selectedId: 'a' })
		const second = proxy({ selectedId: 'b' })
		const { result, rerender, unmount } = renderHook(
			({ store, id }) => useSelector(store, (s) => s.selectedId === id),
			{
				initialProps: { store: first, id: 'a' },
			},
		)
		expect(result.current).toBe(true)
		rerender({ store: first, id: 'b' })
		expect(result.current).toBe(false)
		rerender({ store: second, id: 'b' })
		expect(result.current).toBe(true)
		await mutate(() => {
			first.selectedId = 'b'
			second.selectedId = 'c'
		})
		expect(result.current).toBe(false)
		unmount()
		await mutate(() => {
			second.selectedId = 'b'
		})
	})

	it('uses the new equality function when options change', async () => {
		const store = proxy({ count: 1 })
		const { result, rerender } = renderHook(
			({ ignore }) => useSelector(store, (s) => s.count, { isEqual: ignore ? () => true : Object.is }),
			{ initialProps: { ignore: true } },
		)
		await mutate(() => {
			store.count = 2
		})
		expect(result.current).toBe(1)
		rerender({ ignore: false })
		expect(result.current).toBe(2)
	})

	it('reads a server snapshot', () => {
		const store = proxy({ count: 3 })
		function Reader() {
			return <span>{useSelector(store, (s) => s.count)}</span>
		}
		expect(renderToString(<Reader />)).toBe('<span>3</span>')
	})
})

for (const cached of [false, true]) {
	describe(cached ? 'cached selector surface' : 'context selector surface', () => {
		function setup() {
			const state = proxy({ count: 1, other: 0 })
			const cache = createStoreCache()
			const Store = cached
				? cache.createCachedStore(() => state, { name: 'selector-test' })
				: createContextStore(() => state)
			function Wrapper({ children }: PropsWithChildren) {
				return (
					<cache.Provider>
						<Store.Provider id='one'>{children}</Store.Provider>
					</cache.Provider>
				)
			}
			return { state, Store, Wrapper }
		}

		it('binds useSelector to the provider and checks readonly input and inferred result types', async () => {
			const { state, Store, Wrapper } = setup()
			const { result } = renderHook(
				() =>
					Store.useSelector((s) => {
						expectTypeOf(s).toEqualTypeOf<{ readonly count: number; readonly other: number }>()
						return s.count > 0
					}),
				{ wrapper: Wrapper },
			)
			expectTypeOf(result.current).toEqualTypeOf<boolean>()
			await mutate(() => {
				state.count = 0
			})
			expect(result.current).toBe(false)
		})

		it('selects in Subscribe, applies equality, and passes the live proxy for writes', async () => {
			const { state, Store, Wrapper } = setup()
			let renders = 0
			render(
				<Wrapper>
					<Store.Subscribe
						selector={(s) => ({ positive: s.count > 0 })}
						isEqual={shallowEqual}
					>
						{(value, raw) => {
							expectTypeOf(value).toEqualTypeOf<{ positive: boolean }>()
							expect(raw).toBe(state)
							renders++
							return <span>{String(value.positive)}</span>
						}}
					</Store.Subscribe>
				</Wrapper>,
			)
			const initial = renders
			await mutate(() => {
				state.count = 2
				state.other++
			})
			expect(renders).toBe(initial)
			await mutate(() => {
				state.count = 0
			})
			expect(screen.getByText('false')).toBeInTheDocument()
		})

		it('preserves auto-tracking without a selector and can switch subscription mode', async () => {
			const { state, Store, Wrapper } = setup()
			let renders = 0
			const children = (s: { readonly count: number }) => {
				renders++
				return <span>{s.count}</span>
			}
			const { rerender } = render(
				<Wrapper>
					<Store.Subscribe>{children}</Store.Subscribe>
				</Wrapper>,
			)
			const initial = renders
			await mutate(() => {
				state.other++
			})
			expect(renders).toBe(initial)
			rerender(
				<Wrapper>
					<Store.Subscribe selector={(s) => ({ count: s.count })}>{children}</Store.Subscribe>
				</Wrapper>,
			)
			await mutate(() => {
				state.count = 4
			})
			expect(screen.getByText('4')).toBeInTheDocument()
			rerender(
				<Wrapper>
					<Store.Subscribe>{children}</Store.Subscribe>
				</Wrapper>,
			)
			await mutate(() => {
				state.count = 5
			})
			expect(screen.getByText('5')).toBeInTheDocument()
		})

		it('requires a store Provider', () => {
			const { Store } = setup()
			expect(() => renderHook(() => Store.useSelector((s) => s.count))).toThrow('Missing')
		})
	})
}
