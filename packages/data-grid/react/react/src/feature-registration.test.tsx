import { createColumns } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NARROW_TEST_FEATURES, TEST_FEATURES } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { GridFeatures } from './types'

type User = { id: number; name: string }

const USERS: User[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
	warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})
afterEach(() => {
	warn.mockRestore()
})

const warnings = (): string[] => warn.mock.calls.map((call) => String(call[0]))

/**
 * v9 registers **nothing** by default, so a feature left out of `features` does not fail — its
 * state slice, its table members and its row methods simply do not exist, and the component that
 * reads one gets `undefined` (pr1-outcomes §2.4). Core's development warning is the only check on
 * that, and the React adapter does not register anything on the consumer's behalf: the set is
 * composed by the consumer (design D1) and reaches core through `useDataGrid`'s `features`.
 *
 * So what this file pins is the **path**, not the catalogue: core's per-feature guards are proved
 * feature-by-feature in `core/src/create-table/create-table-options.test.ts`, and what was never
 * proved is that a grid built through the React hook reaches them at all. A regression here is not
 * a missing warning in core — it is `useDataGrid` resolving, reshaping or defaulting `features`
 * such that core is asked a different question than the consumer wrote.
 *
 * {@link NARROW_TEST_FEATURES} is `tableFeatures({})`, the empty set, and exists for exactly this.
 */
describe('feature registration reaches core through useDataGrid', () => {
	it('warns when a configured feature is missing from the set', () => {
		renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: NARROW_TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				editing: { mode: 'row', onSave: () => Promise.resolve() },
			}),
		)

		expect(warnings()).toContainEqual(expect.stringContaining('`editing` is configured, but `editingFeature`'))
	})

	it('warns once per configured-but-unregistered feature, not once for the set', () => {
		renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: NARROW_TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				sorting: true,
				selection: true,
			}),
		)

		expect(warnings()).toContainEqual(expect.stringContaining('`sorting` is configured, but `rowSortingFeature`'))
		expect(warnings()).toContainEqual(expect.stringContaining('`selection` is configured, but `rowSelectionFeature`'))
	})

	/**
	 * The three named-function registries are `@deprecated` upstream in favour of the individual
	 * `filterFn_*` / `sortFn_*` members, and they are load-bearing: a set without `filterFns`
	 * resolves every filter name to nothing and filters no row out — silently. Registered through
	 * the same `features` object, so the same path carries them.
	 */
	it('warns when the filter-function registry is missing from the set', () => {
		renderHook(() =>
			useDataGrid<GridFeatures, User>({
				// The feature is registered; only the registry it resolves names through is absent,
				// which is the case a per-feature check cannot see.
				features: { ...NARROW_TEST_FEATURES, columnFilteringFeature: TEST_FEATURES.columnFilteringFeature },
				data: USERS,
				columns: COLUMNS,
				filtering: true,
			}),
		)

		expect(warnings()).toContainEqual(expect.stringContaining('`filterFns` is not in `features`'))
	})

	it('stays silent on the full set', () => {
		renderHook(() =>
			useDataGrid<GridFeatures, User>({
				features: TEST_FEATURES,
				data: USERS,
				columns: COLUMNS,
				sorting: true,
				selection: true,
				filtering: true,
				editing: { mode: 'row', onSave: () => Promise.resolve() },
			}),
		)

		expect(warnings()).toEqual([])
	})
})
