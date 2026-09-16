import { createColumns } from '@ez-kit/data-grid-core'
import { rowPaginationFeature, rowSortingFeature, tableFeatures } from '@ez-kit/data-grid-core/features'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DataGridOptionsProvider } from './data-grid-options-context'
import { TEST_FEATURES } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { GridFeatures } from './types'
import type { ReactNode } from 'react'

type User = { id: number; name: string }

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = createColumns<User>([{ accessorKey: 'name' }])

/**
 * What `createTable` does after `constructTable`, redone in the hook.
 *
 * `useTable` builds the table inside its own `useState`, so **not one** of those five jobs can be
 * handed to it as an option: each has to be redone by the caller, and each is the shape of defect
 * this migration keeps producing — a value that stops being reached, compiling clean and passing
 * every test that does not name it. These cases name them.
 */
describe('useDataGrid — the five post-construction jobs', () => {
	it('mints the draft atoms once, so a re-render does not reset the draft', () => {
		const { result, rerender } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				draft: true,
				sorting: { manual: true },
			}),
		)

		act(() => {
			result.current.setSorting([{ id: 'name', desc: true }])
		})
		expect(result.current.draft.isDirty()).toBe(true)

		// The falsification: atoms built inside the options resolver would be replaced wholesale
		// here, because `useTable` re-applies the options object on every render.
		rerender()
		rerender()

		expect(result.current.draft.isDirty()).toBe(true)
		expect(result.current.store.state.sorting).toEqual([{ id: 'name', desc: true }])
	})

	// Step 4's case, and the one a mount-only test misses. `useTable` calls
	// `table_setOptions(coreTable, prev => ({ ...prev, ...tableOptions }))` on **every** render, so
	// a handler bound after construction survives only because `tableOptions` carries no
	// `on<Slice>Change` key. A handler that works on mount and is silently overwritten on render
	// two is this migration's signature defect.
	it('keeps the bound state handlers installed across a re-render', () => {
		const onChange = vi.fn()
		const { result, rerender } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				sorting: { onChange },
			}),
		)

		// Mount: the baseline the weaker test would have stopped at.
		act(() => {
			result.current.setSorting([{ id: 'name', desc: true }])
		})
		expect(onChange).toHaveBeenCalledTimes(1)

		rerender()
		rerender()

		// Why it survives, stated as a fact about the options object rather than as a hope: the bag
		// handed to `useTable` — which is what `result.current.options` is, the raw argument and
		// not the table's resolved options — carries no `on<Slice>Change` key at all, so the
		// per-render `{ ...prev, ...tableOptions }` has nothing to overwrite the binding with.
		expect(Object.keys(result.current.options).filter((key) => /^on.+Change$/.test(key))).toEqual([])

		act(() => {
			result.current.setSorting([{ id: 'name', desc: false }])
		})
		expect(onChange).toHaveBeenCalledTimes(2)
		expect(onChange).toHaveBeenLastCalledWith([{ id: 'name', desc: false }])
	})

	it('subscribes config.onStateChange once and reads the latest prop through it', () => {
		const first = vi.fn()
		const second = vi.fn()
		const { result, rerender } = renderHook(
			({ cb }: { cb: typeof first }) =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					sorting: true,
					onStateChange: cb,
				}),
			{ initialProps: { cb: first } },
		)

		rerender({ cb: second })
		act(() => {
			result.current.setSorting([{ id: 'name', desc: true }])
		})

		expect(first).not.toHaveBeenCalled()
		// Once, not twice: a subscription re-made per render would report the same change again.
		expect(second).toHaveBeenCalledTimes(1)
		expect((second.mock.calls[0]?.[0] as { sorting?: unknown } | undefined)?.sorting).toEqual([
			{ id: 'name', desc: true },
		])
	})

	it('carries grid, gridContext and setData on the table after a re-render, not only the first', () => {
		const { result, rerender } = renderHook(
			({ stickyHeader }: { stickyHeader: boolean }) =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					layout: { stickyHeader },
				}),
			{ initialProps: { stickyHeader: false } },
		)
		const contextStore = result.current.gridContext

		rerender({ stickyHeader: true })

		// The three members this layer adds are refreshed onto the stable view each render. The
		// falsification is a hook that assigned them once: `grid` is rebuilt from the merged config
		// every pass, so it would still be here but would report the first render's layout.
		expect(result.current.grid.layout.stickyHeader).toBe(true)
		expect(result.current.setData).toBeTypeOf('function')
		// The store itself is per-table, not per-render: a fresh one would drop every subscriber.
		expect(result.current.gridContext).toBe(contextStore)
	})

	it('keeps setData’s rows after a re-render re-applies the options object', () => {
		const { result, rerender } = renderHook(
			({ tag: _tag }: { tag: number }) =>
				useDataGrid<GridFeatures, User>({ features: TEST_FEATURES, data: USERS, columns: COLUMNS }),
			{ initialProps: { tag: 0 } },
		)

		act(() => {
			result.current.setData([{ id: 3, name: 'Carol' }])
		})
		expect(result.current.getRowModel().rows).toHaveLength(1)

		// The falsification: the options bag carries `data` on every render, so a `setData` that
		// wrote only `options.data` would be undone by the very next pass with nothing to show it.
		rerender({ tag: 1 })

		expect(result.current.getRowModel().rows).toHaveLength(1)
		expect(result.current.getRowModel().rows[0]?.getValue('name')).toBe('Carol')
	})

	it('carries core’s own grid members across instead of losing them to the React bag', () => {
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				direction: 'rtl',
				pinning: { row: { top: true } },
			}),
		)

		// `rowActions`, `direction` and the normalized row-pin config are resolved by core and
		// spelled differently on this object; all three reached nothing before they were carried.
		expect(result.current.grid.direction).toBe('rtl')
		expect(result.current.grid.rowActions.placement).toBeTypeOf('string')
		expect(result.current.grid.pinning.rowConfig).toEqual({ top: true })
	})
})

describe('useDataGrid — controlled state', () => {
	it('lands a controlled slice changed on a re-render', () => {
		const { result, rerender } = renderHook(
			({ sorting }: { sorting: { id: string; desc: boolean }[] }) =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					sorting: true,
					state: { sorting },
				}),
			{ initialProps: { sorting: [] as { id: string; desc: boolean }[] } },
		)
		expect(result.current.getRowModel().rows[0]?.getValue('name')).toBe('Alice')

		rerender({ sorting: [{ id: 'name', desc: true }] })

		// Falsified by dropping the publish: the grid would keep rendering the unsorted order.
		expect(result.current.store.state.sorting).toEqual([{ id: 'name', desc: true }])
		expect(result.current.getRowModel().rows[0]?.getValue('name')).toBe('Bob')
	})

	// §4.4, at the hook level. v9's precedence is `options.atoms[key]` > everything else,
	// unconditionally, so with `draft` on the three deferred axes are the draft's and a controlled
	// write to one of them no longer lands — clean or dirty. This states the new behaviour
	// positively and pins both halves: the write is **ignored**, and the draft is **intact**.
	//
	// Do not "fix" this with a dirtiness check. That is the `DRAFT_AXES` guard the design deleted.
	it('ignores a controlled write to a deferred axis, and leaves the draft intact', () => {
		const { result } = renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				draft: true,
				sorting: { manual: true },
				state: { sorting: [{ id: 'name', desc: true }] },
			}),
		)

		expect(result.current.store.state.sorting).toEqual([])
		expect(result.current.draft.get().sorting).toEqual([])
		expect(result.current.draft.isDirty()).toBe(false)
	})

	it('does not report the consumer’s own controlled value back to them', () => {
		const onStateChange = vi.fn()
		const { rerender } = renderHook(
			({ isPending }: { isPending: boolean }) =>
				useDataGrid<GridFeatures, User>({
					features: TEST_FEATURES,
					data: USERS,
					columns: COLUMNS,
					state: { loading: { isPending, isFetching: false, isError: false, error: null } },
					onStateChange,
				}),
			{ initialProps: { isPending: false } },
		)
		onStateChange.mockClear()

		rerender({ isPending: true })

		// The prop is the source of truth. Reporting it back loops any consumer that mirrors the
		// callback into React state — which is the ordinary controlled shape.
		expect(onStateChange).not.toHaveBeenCalled()
	})
})

// Step 11. `tableFeatures({ … })` hands back the caller's own `{}`-literal, which is exactly what
// `deepMerge`'s `isMergeableObject` accepts — so without the named exception in `mergeOptionLayers`
// a grid that narrows below a kit-wide set runs on the **union** of the two, with no error
// anywhere.
//
// Asserted **by key set**, never by reference: `deepMerge` hands back the upper layer's own object
// untouched whenever the lower layer names nothing, so a reference comparison would pass whatever
// the merge did. That is the flaw an earlier PR-1 test had to be discarded for.
describe('useDataGrid — the feature set replaces across option layers', () => {
	const WIDE = tableFeatures({ rowSortingFeature, rowPaginationFeature })
	const NARROW = tableFeatures({ rowSortingFeature })

	function withDefaults({ children }: { children: ReactNode }) {
		return <DataGridOptionsProvider defaults={{ features: WIDE }}>{children}</DataGridOptionsProvider>
	}

	it('runs on the instance’s set, not on the union with the defaults layer’s', () => {
		const { result } = renderHook(() => useDataGrid({ features: NARROW, data: USERS, columns: COLUMNS }), {
			wrapper: withDefaults,
		})

		const registered = Object.keys(result.current.options.features)
		expect(new Set(registered)).toEqual(new Set(Object.keys(NARROW)))
		// The union's extra member, named: this is the assertion the merge used to fail.
		expect(registered).not.toContain('rowPaginationFeature')
	})

	it('still takes the defaults layer’s set when the instance names none of its own', () => {
		// The other direction, so the fix cannot be "always drop the lower layer's features".
		// `DataGridDefaultOptions` is the only layer on which `features` is optional, which is why
		// an instance config that omits it has to be cast rather than written.
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS } as never), {
			wrapper: withDefaults,
		})

		expect(new Set(Object.keys(result.current.options.features))).toEqual(new Set(Object.keys(WIDE)))
	})
})
