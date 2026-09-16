import { createColumns } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TEST_FEATURES } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { GridFeatures } from './types'
import type { UseDataGridConfig } from './use-data-grid'
import type { FieldState, InputComponentProps, SelectCellConfig } from '@ez-kit/data-grid-core'

type User = { id: number; name: string; status: string }

const USERS: User[] = [{ id: 1, name: 'Alice', status: 'open' }]
const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

/**
 * A column's input slots hand the component the column's own `cell.config`. Naming that config
 * is the only way to read it without a cast, and it is done by annotating the component — which
 * a property-position function type rejects under `strictFunctionTypes`. `ColumnInputRenderer`
 * is declared method-style so these annotations are accepted; if that ever regresses, this file
 * stops compiling and the test run fails before a single assertion runs.
 */
describe('column input slots accept a component annotated with its cell config', () => {
	function StatusFilter({ config }: InputComponentProps<SelectCellConfig>) {
		return <span>{config?.items.length}</span>
	}

	function StatusEditor({ config, value }: FieldState<SelectCellConfig, string>) {
		return (
			<span>
				{value}
				{config?.items.length}
			</span>
		)
	}

	it('compiles a filter and an edit component that read `config.items`', () => {
		const columns = createColumns<User>([
			{
				accessorKey: 'status',
				cell: { type: 'select', config: { items: [{ value: 'open', label: 'Open' }] } },
				filtering: { component: StatusFilter },
				editing: { component: StatusEditor },
			},
		])

		expect(columns).toHaveLength(1)
	})

	it("types an accessorKey column's edit value from the row field", () => {
		const columns = createColumns<User>([
			// `value` is `number` here, not `unknown` — the arm binds it from `id`.
			{ accessorKey: 'id', editing: { component: ({ value }: FieldState<unknown, number>) => <b>{value + 1}</b> } },
		])

		expect(columns).toHaveLength(1)
	})
})

/**
 * `enabled` is the shared off-switch every `boolean | Config` option takes. It used to stop at
 * the top-level features, so a nested config that arrived from a defaults layer could not be
 * turned off for one grid without restating it.
 */
describe('enabled: false on a nested config', () => {
	it('suppresses the selection bar while selection stays on', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				selection: { bar: { enabled: false, variant: 'inline' } },
			}),
		)

		expect(result.current.options.enableRowSelection).toBe(true)
		expect(result.current.grid.selection.bar).toBeUndefined()
	})

	it('suppresses the filter-chips strip while filtering stays on', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				filtering: { chips: { enabled: false, position: 'below' } },
			}),
		)

		expect(result.current.grid.filtering.chips).toBeUndefined()
	})

	it('suppresses row pinning while column pinning stays on', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				pinning: { column: true, row: { enabled: false, top: true } },
			}),
		)

		expect(result.current.options.enableColumnPinning).not.toBe(false)
		expect(result.current.options.enableRowPinning).toBeFalsy()
	})

	it('suppresses the no-results fallback', () => {
		const { result } = renderHook(() =>
			useDataGrid({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				fallbacks: { noResults: { enabled: false } },
			}),
		)

		expect(result.current.grid.fallbacks.noResults).toEqual({ enabled: false })
	})
})

/**
 * `chips` takes the same scalar-or-object shape as a column's `align`, `width` and `pinning`:
 * the position is the whole of what the common case has to say.
 */
describe('filtering.chips scalar form', () => {
	it("reads `chips: 'below'` as the position", () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, filtering: { chips: 'below' } }),
		)

		expect(result.current.grid.filtering.chips).toEqual({ position: 'below' })
	})

	it('still accepts the object form', () => {
		const config: UseDataGridConfig<GridFeatures, User> = {
			features: TEST_FEATURES,
			data: USERS,
			columns: COLUMNS,
			filtering: { chips: { position: 'above' } },
		}
		const { result } = renderHook(() => useDataGrid(config))

		expect(result.current.grid.filtering.chips).toEqual({ position: 'above' })
	})
})

/**
 * `direction` is a fact about the whole grid, so it is a root option rather than a resize
 * setting — and it is readable whether or not resizing is enabled.
 *
 * **Rewritten for v9.** This case used to assert `options.columnResizeDirection === 'rtl'` on a
 * grid with resizing off, under the heading "reaches the resize delta with resizing off", and its
 * doc comment stated that as the contract. That contract is gone: v9 declares
 * `columnResizeDirection` on `TableOptions_ColumnResizing`, so it does not exist without
 * `columnResizingFeature` and core writes it only inside its resizing branch — correctly, because
 * writing it unconditionally is the `sortFns` defect. The invariant the case was really defending
 * — one grid-wide direction, readable with resizing off — survives, and `table.grid.direction`
 * is where it now lives. The reader that took the old contract literally was
 * `header-cell.tsx`'s Alt+Arrow handler; see `ordering.test.tsx`'s two RTL cases.
 */
describe('root direction', () => {
	it('is readable with resizing off', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, direction: 'rtl' }),
		)

		expect(result.current.grid.direction).toBe('rtl')
		// The v9 half of the same fact: the resizing option is absent, not `'rtl'`, because the
		// feature that declares it is not configured on.
		expect(result.current.options.columnResizeDirection).toBeUndefined()
	})

	it('reaches the resize delta once resizing is on', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, direction: 'rtl', resizing: true }),
		)

		expect(result.current.grid.direction).toBe('rtl')
		expect(result.current.options.columnResizeDirection).toBe('rtl')
	})
})
