import { createColumns } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TEST_FEATURES } from './test-utils'
import { useDataGrid } from './use-data-grid'

type User = { id: number; name: string }

const USERS: User[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = createColumns<User>([{ accessorKey: 'name' }])

describe('ResolvedGridOptions — the two names core and React both spell', () => {
	/**
	 * The load-bearing case. Core stores `virtualization` **verbatim**
	 * (`create-table-options.ts:1109-1110`), so a test only discriminates between the two §2.1
	 * shapes on an input the two forms spell **differently** — and the scalar is that input:
	 * core keeps the boolean `true`, `normalizeVirtualization` returns `{ row: {} }`.
	 *
	 * An input like `{ row: { overscan: 8 } }` cannot do this job: core's passthrough and
	 * react's normalized value are the same object for it, so every assertion passes against
	 * either. So can truthiness: `true` and `{ row: {} }` are both truthy, which is exactly why
	 * `toBeTruthy()` is the assertion that cannot tell the shapes apart.
	 */
	it('grid.virtualization is the normalized shape, never the unresolved option core passes through', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, virtualization: true }),
		)

		const virtualization: unknown = result.current.grid.virtualization

		// Falsified by core's passthrough: it stores the boolean, which has no `row` at all.
		expect(typeof virtualization).toBe('object')
		expect(virtualization).not.toBe(true)
		expect(virtualization).toHaveProperty('row')
		expect(virtualization).toEqual({ row: {} })
	})

	/**
	 * The second input the two forms spell differently: core keeps `{ row: true }`, react
	 * normalizes the inner scalar to `{ row: {} }`. It discriminates for the same reason as the
	 * case above, one level down.
	 */
	it('grid.virtualization normalizes the inner scalar too, rather than storing `{ row: true }`', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, virtualization: { row: true } }),
		)

		const virtualization: unknown = result.current.grid.virtualization

		expect((virtualization as { row: unknown }).row).not.toBe(true)
		expect(virtualization).toEqual({ row: {} })
	})

	/**
	 * Coverage only — this case does **not** discriminate between the two shapes, and is not
	 * offered as if it did: core stores `{ row: { overscan: 8 } }` verbatim and react's
	 * normalized value is the same object, so both assertions below pass against either. What it
	 * covers is that the config survives the merge at all.
	 */
	it('grid.virtualization carries a row config through the merge', () => {
		const { result } = renderHook(() =>
			useDataGrid({ features: TEST_FEATURES, data: USERS, columns: COLUMNS, virtualization: { row: { overscan: 8 } } }),
		)

		expect(result.current.grid.virtualization).toEqual({ row: { overscan: 8 } })
	})
})
