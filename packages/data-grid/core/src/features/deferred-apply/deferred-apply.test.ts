import {
	columnFilteringFeature,
	columnVisibilityFeature,
	constructTable,
	createExpandedRowModel,
	createFilteredRowModel,
	filterFns,
	globalFilteringFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import { describe, expect, it } from 'vitest'

import { createTable, createTableOptions } from '../../create-table'

import { createDraftAtoms, draftFeature } from './deferred-apply'

import type { AppliedState } from './deferred-apply'
import type { ColumnDef } from '../../column/types'
import type {
	ColumnFiltersState,
	ExternalAtoms,
	PaginationState,
	RowSelectionState,
	SortingState,
	TableFeatures,
	TableOptions,
} from '@tanstack/table-core'

type Row = { id: string; name: string; age: number }

const DATA: Row[] = [
	{ id: '1', name: 'Ann', age: 30 },
	{ id: '2', name: 'Bob', age: 40 },
]
const COLUMNS: ColumnDef<Row>[] = [{ accessorKey: 'name' }, { accessorKey: 'age' }]

/**
 * The full set the bulk of these cases run on — all three deferred axes plus the two slices
 * `apply()` writes.
 */
const FULL = tableFeatures({
	draftFeature,
	rowSortingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	// The three slices the gating cases prove are **not** deferred.
	columnVisibilityFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	filterFns,
})

/** Draft on a table with one deferred axis and neither of the slices `apply()` writes. */
const SORTING_ONLY = tableFeatures({ draftFeature, rowSortingFeature })

function makeTable(overrides: Record<string, unknown> = {}) {
	return createTable({
		features: FULL,
		data: DATA,
		columns: COLUMNS,
		sorting: { manual: true },
		filtering: { manual: true },
		globalFiltering: true,
		draft: true,
		...overrides,
	} as Parameters<typeof createTable>[0])
}

/** The slices these cases read off the store, named so the assertions are not indexing `unknown`. */
type ObservedState = {
	applied: AppliedState
	sorting: SortingState
	columnFilters: ColumnFiltersState
	globalFilter: unknown
	pagination: PaginationState
	rowSelection: RowSelectionState
}

/**
 * The state the table currently holds.
 *
 * From a test the feature set is resolved, so this reads the store directly — `../../feature-state`
 * is for feature code, where it is not. It replaces the v8 `table.getState()` these cases used to
 * call, which v9 removed.
 */
const stateOf = (table: { store: { state: unknown } }) => table.store.state as ObservedState

describe('draftFeature — feature composition', () => {
	it('contributes neither the applied slice nor table.draft without the feature', () => {
		// D1, demonstrated: omit the feature and the grid has neither of its surfaces.
		//
		// Each read is a `@ts-expect-error`, which is the type half of the same claim: with the
		// feature out of the set these members do not *exist* on the table, and the directive fails
		// the build the day one of them starts existing unconditionally again.
		const table = createTable({ features: tableFeatures({}), data: DATA, columns: COLUMNS })

		// @ts-expect-error — the `applied` atom belongs to `draftFeature`
		expect(table.atoms.applied).toBeUndefined()
		// @ts-expect-error — so does `table.draft`
		expect(table.draft).toBeUndefined()
	})

	it('installs table.draft, and get() reads the real atoms', () => {
		const table = makeTable()

		expect(typeof table.draft.apply).toBe('function')

		table.draft.set({ sorting: [{ id: 'age', desc: true }] })
		expect(table.atoms.sorting.get()).toEqual([{ id: 'age', desc: true }])
		expect(table.draft.get().sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('hands the three live axes to the table as external atoms', () => {
		// The port's whole premise. `options.atoms[key]` is what `table.atoms[key]` resolves
		// *instead of* the base atom, so the feature — not the table — owns what the user is
		// composing.
		const table = makeTable()
		const atoms = (table.options as { atoms?: Record<string, { get: () => unknown }> }).atoms

		expect(Object.keys(atoms ?? {}).sort()).toEqual(['columnFilters', 'globalFilter', 'sorting'])
		table.draft.set({ sorting: [{ id: 'age', desc: true }] })
		expect(atoms?.sorting?.get()).toEqual([{ id: 'age', desc: true }])
		// The base atom is still there and still holds the applied seed — nothing reads it while
		// an external atom is supplied, which is exactly why a write aimed at it would be silent.
		expect(table.baseAtoms.sorting.get()).toEqual([])
	})

	it('does not create the atoms when the feature is registered but draft is off', () => {
		const table = createTable({ features: FULL, data: DATA, columns: COLUMNS, sorting: { manual: true } })

		expect((table.options as { atoms?: unknown }).atoms).toBeUndefined()
		expect((table.options as { draft?: unknown }).draft).toBeUndefined()
	})

	it('drops the seed-only `draft` key rather than minting a state slice for it', () => {
		// Straight through `constructTable`, because `createTableOptions` strips the key on its
		// own way past — this is the guard for every other construction path, and the assertion
		// fails without `getInitialState`'s destructure.
		const options = {
			features: { coreReactivityFeature: storeReactivityBindings(), ...SORTING_ONLY },
			data: DATA,
			columns: [],
			initialState: { draft: { sorting: [{ id: 'name', desc: true }] } },
		}
		const table = constructTable(options as unknown as TableOptions<typeof SORTING_ONLY, Row>)

		expect((table.atoms as Record<string, unknown>).draft).toBeUndefined()
		expect(table.store.state).not.toHaveProperty('draft')
	})
})

describe('draft — applied snapshot', () => {
	it('is not dirty on a fresh table', () => {
		expect(makeTable().draft.isDirty()).toBe(false)
	})

	it('seeds the applied snapshot from initialState so an initial sort is not dirty', () => {
		const table = makeTable({ initialState: { sorting: [{ id: 'name', desc: false }] } })

		expect(table.draft.isDirty()).toBe(false)
		expect(stateOf(table).applied.sorting).toEqual([{ id: 'name', desc: false }])
	})

	it('becomes dirty once a sort is added, without moving the applied snapshot', () => {
		const table = makeTable()

		table.setSorting([{ id: 'age', desc: true }])

		expect(table.draft.isDirty()).toBe(true)
		expect(table.draft.get().sorting).toEqual([{ id: 'age', desc: true }])
		expect(stateOf(table).applied.sorting).toEqual([])
	})

	it('counts pending changes per axis', () => {
		const table = makeTable()

		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		expect(table.draft.getPendingCount()).toEqual({ sorting: 1, columnFilters: 1, globalFilter: 0 })
	})

	it('reports search as pending when the global filter differs from applied', () => {
		const table = makeTable()

		table.setGlobalFilter('bob')

		expect(table.draft.getPendingCount()).toEqual({ sorting: 0, columnFilters: 0, globalFilter: 1 })
	})

	it('seeds a restored draft from initialState.draft, leaving applied at its own seed', () => {
		const table = makeTable({
			initialState: {
				sorting: [{ id: 'name', desc: false }],
				draft: { sorting: [{ id: 'age', desc: true }] },
			},
		})

		expect(stateOf(table).sorting).toEqual([{ id: 'age', desc: true }])
		expect(stateOf(table).applied.sorting).toEqual([{ id: 'name', desc: false }])
		expect(table.draft.isDirty()).toBe(true)
	})

	it('reports no draft at all when the feature is registered but draft is off', () => {
		// Registered-and-off is not a pending draft. `applied` is seeded once and never moves
		// there, so the gap between it and the live axes is not a draft — it is the ordinary
		// table doing its job. v8 kept the snapshot dragging along behind the live axes
		// (`syncApplied`, inside the funnel); this reports the fact instead.
		const table = createTable({ features: FULL, data: DATA, columns: COLUMNS, sorting: { manual: true } })

		table.setSorting([{ id: 'age', desc: true }])

		expect(table.draft.isDirty()).toBe(false)
		expect(table.draft.getPendingCount()).toEqual({ sorting: 0, columnFilters: 0, globalFilter: 0 })
		expect(table.draft.get().sorting).toEqual([{ id: 'age', desc: true }])
	})
})

describe('draft — apply / reset', () => {
	it('apply() moves the draft into the applied snapshot and clears dirtiness', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.apply()

		expect(table.draft.isDirty()).toBe(false)
		expect(stateOf(table).applied.sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('apply() resets pageIndex to 0 in the same state change', () => {
		const table = makeTable({ pagination: { manual: true, pageSize: 10, rowCount: 100 } })
		table.setPageIndex(3)
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.apply()

		expect(stateOf(table).pagination.pageIndex).toBe(0)
	})

	it('apply() clears the row selection', () => {
		const table = makeTable({ selection: true })
		table.setRowSelection({ '1': true })
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.apply()

		expect(stateOf(table).rowSelection).toEqual({})
	})

	it('apply() works on a draft grid with neither pagination nor selection registered', () => {
		// `apply()` writes `pagination` and `rowSelection`, which belong to two features that are
		// legitimately optional — so both writes are `writeForeignSlice` and must no-op rather
		// than throw. `writeOwnSlice` there fails this case with the missing-slice diagnostic.
		const table = createTable({
			features: SORTING_ONLY,
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			draft: true,
		})

		table.draft.set({ sorting: [{ id: 'name', desc: true }] })
		expect(() => {
			table.draft.apply()
		}).not.toThrow()
		expect(table.draft.isDirty()).toBe(false)
	})

	it('reset() restores the live axes from the applied snapshot', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.reset()

		expect(table.draft.isDirty()).toBe(false)
		expect(stateOf(table).sorting).toEqual([])
		expect(stateOf(table).columnFilters).toEqual([])
	})

	it('resetAxis() backs out one axis and leaves the others pending', () => {
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.resetAxis('sorting')

		expect(stateOf(table).sorting).toEqual([])
		expect(stateOf(table).columnFilters).toEqual([{ id: 'name', value: 'An' }])
		expect(table.draft.isDirty()).toBe(true)
	})

	it('set() writes draft values without touching the applied snapshot', () => {
		const table = makeTable()

		table.draft.set({ globalFilter: 'bob' })

		expect(stateOf(table).globalFilter).toBe('bob')
		expect(stateOf(table).applied.globalFilter).toBeUndefined()
		expect(table.draft.isDirty()).toBe(true)
	})

	it('table.reset() restores the deferred axes, which the internal reset pass cannot reach', () => {
		// The one place where the rule every other feature follows inverts. `table_reset` writes
		// `baseAtoms[key].set(…)` and nothing else, while `table.atoms[key]` resolves the external
		// atom *instead of* the base one — so without this feature's `resetTableInstanceData` the
		// pending draft survives the reset. Substituting a no-op reset hook fails exactly here.
		const table = makeTable()
		table.setSorting([{ id: 'age', desc: true }])
		table.setGlobalFilter('bob')
		expect(table.draft.isDirty()).toBe(true)

		table.reset()

		expect(stateOf(table).sorting).toEqual([])
		expect(stateOf(table).globalFilter).toBeUndefined()
		expect(table.draft.isDirty()).toBe(false)
	})

	it('table.reset() clears a draft the table was born with rather than restoring it', () => {
		// `initialState.draft` seeds the atoms at construction; the reset puts them back to
		// `initialState.applied` instead, so the two end up in step and the grid comes back clean.
		// A reset that handed back a pending draft would be a reset that leaves the grid dirty.
		const table = makeTable({
			initialState: {
				sorting: [{ id: 'name', desc: false }],
				draft: { sorting: [{ id: 'age', desc: true }] },
			},
		})
		expect(table.draft.isDirty()).toBe(true)

		table.reset()

		expect(stateOf(table).sorting).toEqual([{ id: 'name', desc: false }])
		expect(table.draft.isDirty()).toBe(false)
	})
})

describe('draft — emission gating', () => {
	function makeSpyTable() {
		const calls: { sorting: unknown[]; state: number } = { sorting: [], state: 0 }
		const table = createTable({
			features: FULL,
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true, onChange: (s) => calls.sorting.push(s) },
			filtering: { manual: true },
			globalFiltering: true,
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
			draft: true,
			onStateChange: () => {
				calls.state += 1
			},
		})
		return { table, calls }
	}

	it('does not emit while the draft is only accumulating', () => {
		const { table, calls } = makeSpyTable()

		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		expect(calls.state).toBe(0)
		expect(calls.sorting).toEqual([])
	})

	it('emits exactly once on apply()', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])

		table.draft.apply()

		expect(calls.state).toBe(1)
		expect(calls.sorting).toEqual([[{ id: 'age', desc: true }]])
	})

	it('does not emit on reset()', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])

		table.draft.reset()

		expect(calls.state).toBe(0)
	})

	it('emits immediately for pagination, which is never deferred', () => {
		const { table, calls } = makeSpyTable()

		table.setPageIndex(2)

		expect(calls.state).toBe(1)
	})

	it('emits the applied query, not the draft, when the page changes while dirty', () => {
		const seen: ObservedState[] = []
		const table = createTable({
			features: FULL,
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			filtering: { manual: true },
			globalFiltering: true,
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
			draft: true,
			onStateChange: (state) => {
				seen.push(state)
			},
		})
		table.setSorting([{ id: 'age', desc: true }])
		table.setColumnFilters([{ id: 'name', value: 'An' }])
		table.setGlobalFilter('an')

		table.setPageIndex(1)

		const last = seen.at(-1)
		expect(last?.sorting).toEqual([])
		expect(last?.columnFilters).toEqual([])
		expect(last?.globalFilter).toBeUndefined()
	})

	it('does not invent a deferred slice the table does not have', () => {
		// `tableFeatures({ rowSortingFeature, draftFeature })` has no `columnFilters` and no
		// `globalFilter`. The projection replaces an axis only where the state carries it, so the
		// emitted snapshot has the same keys as `table.store.state` — writing all three
		// unconditionally is the same defect as dropping one, in the other direction.
		const seen: Record<string, unknown>[] = []
		const table = createTable({
			features: SORTING_ONLY,
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			draft: true,
			onStateChange: (state) => {
				seen.push(state as unknown as Record<string, unknown>)
			},
		})

		table.draft.set({ sorting: [{ id: 'age', desc: true }] })
		table.draft.apply()

		const last = seen.at(-1)
		expect(last).not.toBeUndefined()
		expect(last).not.toHaveProperty('columnFilters')
		expect(last).not.toHaveProperty('globalFilter')
		expect(last).not.toHaveProperty('applied')
		expect(last?.sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('still emits when columnVisibility changes while the draft is dirty', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])
		expect(calls.state).toBe(0)

		table.setColumnVisibility({ age: false })

		expect(calls.state).toBe(1)
	})

	it('still emits when rowSelection changes while the draft is dirty', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])
		expect(calls.state).toBe(0)

		table.setRowSelection({ '1': true })

		expect(calls.state).toBe(1)
	})

	it('still emits when expanded changes while the draft is dirty', () => {
		const { table, calls } = makeSpyTable()
		table.setSorting([{ id: 'age', desc: true }])
		expect(calls.state).toBe(0)

		table.setExpanded({ '1': true })

		expect(calls.state).toBe(1)
	})

	it('apply() with a clean draft emits nothing', () => {
		const { table, calls } = makeSpyTable()

		table.draft.apply()

		expect(calls.state).toBe(0)
		expect(calls.sorting).toEqual([])
	})

	it('does not clear row selection or move the page when apply() runs on a clean draft', () => {
		const { table } = makeSpyTable()
		table.setRowSelection({ '1': true })
		table.setPageIndex(2)

		table.draft.apply()

		expect(stateOf(table).rowSelection).toEqual({ '1': true })
		expect(stateOf(table).pagination.pageIndex).toBe(2)
	})

	it('filtering.onChange and globalFiltering.onChange stay silent while accumulating and fire once on apply', () => {
		const filterCalls: unknown[] = []
		const globalCalls: unknown[] = []
		const table = createTable({
			features: FULL,
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			filtering: { manual: true, onChange: (f) => filterCalls.push(f) },
			globalFiltering: { onChange: (g) => globalCalls.push(g) },
			draft: true,
		})

		table.setColumnFilters([{ id: 'name', value: 'An' }])
		table.setGlobalFilter('an')

		expect(filterCalls).toEqual([])
		expect(globalCalls).toEqual([])

		table.draft.apply()

		expect(filterCalls).toEqual([[{ id: 'name', value: 'An' }]])
		expect(globalCalls).toEqual(['an'])
	})

	it('apply() notifies only the axes that actually moved', () => {
		// `isDirty()` is true when *any* axis is pending, so a tail that fired all three would tell
		// a consumer who typed in the search box that their sorting changed — a second request on
		// the channel refetches are wired to. v8's funnel carried the same per-axis guard.
		const sortingCalls: unknown[] = []
		const filterCalls: unknown[] = []
		const globalCalls: unknown[] = []
		const table = createTable({
			features: FULL,
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true, onChange: (s) => sortingCalls.push(s) },
			filtering: { manual: true, onChange: (f) => filterCalls.push(f) },
			globalFiltering: { onChange: (g) => globalCalls.push(g) },
			draft: true,
		})

		table.draft.set({ columnFilters: [{ id: 'name', value: 'An' }] })
		table.draft.apply()

		expect(filterCalls).toEqual([[{ id: 'name', value: 'An' }]])
		expect(sortingCalls).toEqual([])
		expect(globalCalls).toEqual([])
	})

	it('behaves exactly as today when draft is off', () => {
		// The feature is registered and switched off — the configuration a shared grid with a wide
		// feature set produces at a use site that does not defer. Emission is plain, and nothing
		// reports a draft.
		const calls: number[] = []
		const table = createTable({
			features: FULL,
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			onStateChange: () => calls.push(1),
		})

		table.setSorting([{ id: 'age', desc: true }])

		expect(calls).toHaveLength(1)
		expect(table.draft.isDirty()).toBe(false)
	})

	it('emits on every slice a non-deferred grid changes, with no feature registered at all', () => {
		// The other half of the branch in `createTable`: with no atoms there is no filter, so the
		// subscription is plain emission and stays that way.
		const calls: number[] = []
		const table = createTable({
			features: tableFeatures({ rowSortingFeature, rowPaginationFeature }),
			data: DATA,
			columns: COLUMNS,
			sorting: { manual: true },
			pagination: { manual: true, pageSize: 10, rowCount: 100 },
			onStateChange: () => calls.push(1),
		})

		table.setSorting([{ id: 'age', desc: true }])
		table.setPageIndex(1)

		expect(calls).toHaveLength(2)
	})
})

describe('draft — controlled input and misconfiguration', () => {
	it('a controlled state mirror does not clobber a pending draft', () => {
		// What `syncControlledState`'s hand-written `DRAFT_AXES` filter used to do, now a property
		// of atom precedence: `table.atoms[key]` resolves `options.atoms[key]` and never looks at
		// `options.state[key]` when one is present (`constructTable.js:88-99`). Drop the external
		// atoms and the mirrored-back applied query wins, which is the defect this replaced.
		const table = makeTable()

		table.draft.set({ sorting: [{ id: 'name', desc: false }] })
		// The consumer mirrors back what it last saw — the APPLIED query, which is empty.
		table.setOptions((prev) => ({ ...prev, state: { ...prev.state, sorting: [] } }))

		expect(table.draft.get().sorting).toEqual([{ id: 'name', desc: false }])
		expect(table.draft.isDirty()).toBe(true)
	})

	it('accepts controlled updates to non-deferred slices while dirty', () => {
		const table = makeTable({ pagination: { manual: true, pageSize: 10, rowCount: 100 } })
		table.setSorting([{ id: 'age', desc: true }])

		table.setOptions((prev) => ({ ...prev, state: { ...prev.state, pagination: { pageIndex: 2, pageSize: 10 } } }))

		expect(stateOf(table).pagination.pageIndex).toBe(2)
		expect(stateOf(table).sorting).toEqual([{ id: 'age', desc: true }])
	})

	it('a draft axis under an external atom ignores controlled state even when clean', () => {
		// The v8 shape accepted a controlled write to a deferred axis once the draft was clean;
		// v9's precedence does not make that distinction, and it is the right one to lose. A
		// consumer who owns the query writes it with `draft.set()` — the atom is the channel.
		const table = makeTable()

		table.setOptions((prev) => ({ ...prev, state: { ...prev.state, sorting: [{ id: 'name', desc: false }] } }))

		// Ignored, not merely invisible in the snapshot: the draft reports the same value the
		// table does, and the table stays clean rather than counting the mirrored write as pending.
		expect(stateOf(table).sorting).toEqual([])
		expect(table.draft.get().sorting).toEqual([])
		expect(table.draft.isDirty()).toBe(false)
	})

	it('throws when draft is set without a manual axis', () => {
		expect(() => createTable({ features: FULL, data: DATA, columns: COLUMNS, sorting: true, draft: true })).toThrow(
			/`draft` requires/,
		)
	})
})

describe('createDraftAtoms', () => {
	it('seeds the live atoms from the applied seed when no draft is restored', () => {
		const atoms = createDraftAtoms({ sorting: [{ id: 'name', desc: true }], globalFilter: 'x' })

		expect(atoms.sorting.get()).toEqual([{ id: 'name', desc: true }])
		expect(atoms.columnFilters.get()).toEqual([])
		expect(atoms.globalFilter.get()).toBe('x')
	})

	it('lays the restored draft over the applied seed, per axis', () => {
		const atoms = createDraftAtoms({
			sorting: [{ id: 'name', desc: true }],
			globalFilter: 'applied',
			draft: { sorting: [{ id: 'age', desc: false }] },
		})

		expect(atoms.sorting.get()).toEqual([{ id: 'age', desc: false }])
		// Untouched by the draft seed, so it stays at the applied value rather than the default.
		expect(atoms.globalFilter.get()).toBe('applied')
	})

	it('honours an explicit undefined in the restored draft', () => {
		// `'globalFilter' in draft` rather than `?? applied`: clearing the search *is* a draft, and
		// `undefined` is its value. `??` would silently restore the applied search instead.
		const atoms = createDraftAtoms({ globalFilter: 'applied', draft: { globalFilter: undefined } })

		expect(atoms.globalFilter.get()).toBeUndefined()
	})

	it('defaults every axis with no seed at all', () => {
		const atoms = createDraftAtoms()

		expect(atoms.sorting.get()).toEqual([])
		expect(atoms.columnFilters.get()).toEqual([])
		expect(atoms.globalFilter.get()).toBeUndefined()
	})

	it('is the caller’s to create once — a table given one set keeps writing to that set', () => {
		// Why `createTable` calls it once and `useDataGrid` will call it in a `useState`
		// initializer: the atoms *are* the draft, so a fresh set per render would reset it.
		const atoms = createDraftAtoms()
		const { options } = createTableOptions(
			{
				features: SORTING_ONLY,
				data: DATA,
				columns: COLUMNS,
				sorting: { manual: true },
				draft: true,
			},
			{ atoms: atoms as unknown as ExternalAtoms<typeof SORTING_ONLY> },
		)
		const table = constructTable({
			...options,
			features: { coreReactivityFeature: storeReactivityBindings(), ...options.features },
		} as unknown as TableOptions<TableFeatures, Row>)

		table.draft.set({ sorting: [{ id: 'age', desc: true }] })

		expect(atoms.sorting.get()).toEqual([{ id: 'age', desc: true }])
	})
})
