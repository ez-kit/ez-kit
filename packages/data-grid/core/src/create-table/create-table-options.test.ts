import {
	columnFacetingFeature,
	columnFilteringFeature,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createColumns } from '../column/create-columns'
import { DEFAULT_PAGE_SIZE } from '../defaults'
import {
	creatingFeature,
	deletingFeature,
	draftFeature,
	editingFeature,
	infiniteFeature,
	loadingFeature,
	rowOrderingFeature,
} from '../features/entry'
import { RowActionsPlacement } from '../features/row-actions'

import { createTableOptions } from './create-table-options'

import type { StateHandlerTable } from './create-table-options'

type Row = { id: string; name: string; age: number }

const rows: Row[] = [
	{ id: '1', name: 'Ada', age: 36 },
	{ id: '2', name: 'Grace', age: 45 },
]

const columns = createColumns<Row>([{ accessorKey: 'name' }, { accessorKey: 'age' }])

// Carries pagination as well as sorting so the cases below that configure `pagination` do not
// trip the registered-vs-configured guard and spray warnings through the run.
const features = tableFeatures({
	rowSortingFeature,
	rowPaginationFeature,
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
})

/**
 * Column filtering registered, faceting deliberately not — the silent config the guard covers.
 *
 * `filterFns` rides along in every filtering fixture here because a filtering table genuinely needs
 * it: without it each column's `'auto'` resolves to no comparator and nothing is filtered. Leaving
 * it out would make these cases assert two warnings where they mean to assert one.
 */
const filteringOnly = tableFeatures({
	columnFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns,
})

/** Everything faceted filtering needs, so the guard must stay quiet. */
const withFaceting = tableFeatures({
	columnFilteringFeature,
	columnFacetingFeature,
	filteredRowModel: createFilteredRowModel(),
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	filterFns,
})

/**
 * `options` carries no return annotation, so its conditional spreads infer as a union and a key
 * only some members hold cannot be read off it. Whether such a key is there at all is exactly
 * what the gating assertions are about, so they read it through the index signature.
 */
const optionsOf = (resolved: { options: object }): Record<string, unknown> =>
	resolved.options as Record<string, unknown>

/**
 * The three members of a constructed table an `on<Slice>Change` handler touches, faked so the
 * handlers can be exercised without building a real table — which cannot be done in this package
 * yet (`getCoreRowModel is not a function`, the PR-1 baseline).
 *
 * `set` takes the updater function `makeStateUpdater` hands it, exactly as a real atom does.
 */
function fakeTable(initial: Record<string, unknown>): {
	table: StateHandlerTable
	read: () => Record<string, unknown>
} {
	const values: Record<string, unknown> = { ...initial }
	const baseAtoms: Record<string, { get: () => unknown; set: (updater: unknown) => void }> = {}
	const atoms: Record<string, { get: () => unknown }> = {}

	for (const key of Object.keys(values)) {
		baseAtoms[key] = {
			get: () => values[key],
			set: (updater) => {
				values[key] = typeof updater === 'function' ? (updater as (old: unknown) => unknown)(values[key]) : updater
			},
		}
		atoms[key] = { get: () => values[key] }
	}

	return { table: { options: {}, baseAtoms, atoms }, read: () => values }
}

describe('createTableOptions', () => {
	it('returns no live state wiring — that stays in createTable', () => {
		const { options } = createTableOptions({ features, data: rows, columns })

		expect(options).not.toHaveProperty('state')
		expect(options).not.toHaveProperty('onStateChange')
	})

	it('gates sorting at the table level rather than by attaching a row model', () => {
		const on = createTableOptions({ features, data: rows, columns, sorting: true })
		const off = createTableOptions({ features, data: rows, columns })

		// positive: the resolver produces a usable v9 option object
		expect(on.options.features).toBe(features)
		expect(on.options.data).toBe(rows)
		expect(on.options.columns.map((c) => c.id ?? (c as { accessorKey?: string }).accessorKey)).toEqual(['name', 'age'])
		expect(on.options.initialState).toBeDefined()

		// negative: the row model is a feature slot now, not an option
		expect(on.options).not.toHaveProperty('getSortedRowModel')
		expect(on.options).not.toHaveProperty('getCoreRowModel')
		expect(optionsOf(on).enableSorting).toBeUndefined()
		expect(optionsOf(off).enableSorting).toBe(false)
	})

	it('returns non-TanStack config in `grid`, not in `options`', () => {
		const { options, grid } = createTableOptions({ features, data: rows, columns, direction: 'rtl' })

		expect(grid.direction).toBe('rtl')
		expect(grid.rowActions.placement).toBe(RowActionsPlacement.Inline)
		expect(options).not.toHaveProperty('rowActions')
		expect(options).not.toHaveProperty('virtualization')
		expect(options).not.toHaveProperty('pinning')
		// `columnResizeDirection` is an option of `columnResizingFeature` and does not exist
		// without it, so the grid's own direction travels in `grid`, not in `options`.
		expect(options).not.toHaveProperty('columnResizeDirection')
	})

	it('puts the named comparator registry in the feature set, not in the options bag', () => {
		const byLength = vi.fn()
		const { options } = createTableOptions({
			features,
			data: rows,
			columns,
			sorting: { fns: { byLength } },
		})

		expect(options).not.toHaveProperty('sortFns')
		expect((options.features as { sortFns?: Record<string, unknown> }).sortFns).toEqual({ byLength })
		// the consumer's own set is left untouched
		expect(features).not.toHaveProperty('sortFns')
	})

	it('seeds pagination with the default page size, in `options.initialState`', () => {
		const { options } = createTableOptions({ features, data: rows, columns, pagination: true })

		expect(options.initialState.pagination?.pageSize).toBe(DEFAULT_PAGE_SIZE)
	})

	it('reports the draft flag from config', () => {
		const plain = createTableOptions({ features, data: rows, columns })
		const drafted = createTableOptions({
			features,
			data: rows,
			columns,
			sorting: { manual: true },
			draft: true,
		})

		expect(plain.deferred).toBe(false)
		expect(drafted.deferred).toBe(true)
	})

	it('builds an on<Slice>Change option per configured callback, without calling it', () => {
		const onSort = vi.fn()
		const { bindStateHandlers } = createTableOptions({
			features,
			data: rows,
			columns,
			sorting: { onChange: onSort },
		})

		const { table } = fakeTable({ sorting: [] })
		const handlers = bindStateHandlers(table)

		expect(handlers.onSortingChange).toBeTypeOf('function')
		// A slice nobody configured keeps v9's built-in writer.
		expect(handlers).not.toHaveProperty('onPaginationChange')
		expect(onSort).not.toHaveBeenCalled()
	})

	it('writes the slice itself before calling the consumer back', () => {
		const onSort = vi.fn()
		const { bindStateHandlers } = createTableOptions({
			features,
			data: rows,
			columns,
			sorting: { onChange: onSort },
		})

		const { table, read } = fakeTable({ sorting: [] })
		const next = [{ id: 'name', desc: true }]
		bindStateHandlers(table).onSortingChange?.(next)

		// Supplying the option replaces v9's built-in writer, so a handler that only forwarded
		// would leave the state untouched and the feature dead.
		expect(read().sorting).toBe(next)
		expect(onSort).toHaveBeenCalledWith(next)
	})

	it('enforces the column invariants on every pinning write, callback or not', () => {
		const pinned = createColumns<Row>([{ accessorKey: 'name', pinning: 'start' }, { accessorKey: 'age' }])
		const { bindStateHandlers } = createTableOptions({ features, data: rows, columns: pinned, pinning: true })

		const { table, read } = fakeTable({ columnPinning: { start: ['name'], end: [] } })
		// The user cannot reach this state through the UI — the column menu hides the pin
		// section for a statically pinned column — but a programmatic write can.
		bindStateHandlers(table).onColumnPinningChange?.({ start: [], end: [] })

		// `name` is restored because it is statically pinned; `__actions__` because row pinning
		// mounted the actions column, and a system column's pin is an invariant too.
		expect(read().columnPinning).toEqual({ start: ['name'], end: ['__actions__'] })
	})

	it('is pure — two calls with the same config agree on every resolved flag', () => {
		const config = { features, data: rows, columns, sorting: true, pagination: true } as const
		const a = createTableOptions({ ...config })
		const b = createTableOptions({ ...config })

		expect(a.options.enableColumnResizing).toBe(b.options.enableColumnResizing)
		expect(a.options.enableRowSelection).toBe(b.options.enableRowSelection)
		expect(a.options.initialState.pagination).toEqual(b.options.initialState.pagination)
		expect(a.deferred).toBe(b.deferred)
	})

	describe('the registered-vs-configured guard', () => {
		afterEach(() => {
			vi.restoreAllMocks()
		})

		const warnings = (): string[] => {
			const spy = vi.mocked(console.warn)
			return spy.mock.calls.map((call) => String(call[0]))
		}

		it('warns when faceted filtering is configured but its feature set members are missing', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			createTableOptions({ features: filteringOnly, data: rows, columns, filtering: { faceted: true } })

			expect(warnings()).toHaveLength(1)
			expect(warnings()[0]).toContain('`columnFacetingFeature`, `facetedRowModel`, `facetedUniqueValues`')
			expect(warnings()[0]).toContain('has no effect')
		})

		it('warns when a single column asks for facets and the table does not', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			// The case that used to attach the row models on the column's behalf, and is now
			// silent: one column opting in is enough to need the slots.
			const faceted = createColumns<Row>([
				{ accessorKey: 'name', filtering: { faceted: true } },
				{ accessorKey: 'age' },
			])
			createTableOptions({ features: filteringOnly, data: rows, columns: faceted, filtering: true })

			expect(warnings()).toHaveLength(1)
			expect(warnings()[0]).toContain('`columnFacetingFeature`')
		})

		it('names only the members that are actually missing', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			const partial = tableFeatures({
				columnFilteringFeature,
				columnFacetingFeature,
				filteredRowModel: createFilteredRowModel(),
				facetedRowModel: createFacetedRowModel(),
				filterFns,
			})
			createTableOptions({ features: partial, data: rows, columns, filtering: { faceted: true } })

			expect(warnings()[0]).toContain('`facetedUniqueValues` is not in `features`')
			expect(warnings()[0]).not.toContain('`columnFacetingFeature`')
		})

		it('stays quiet when every faceted member is registered', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			createTableOptions({ features: withFaceting, data: rows, columns, filtering: { faceted: true } })

			expect(warnings()).toHaveLength(0)
		})

		// `filterFns` is the third guarded slot. Unlike the other two it is not gated on an option
		// being *enabled* but on that option resolving to a filter-function **name** rather than a
		// function — so each of its two conditions needs its own positive, and each needs a
		// negative where the same config resolves a function and must stay quiet.
		it('warns when a plain column filters and `filterFns` is missing', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			const noFns = tableFeatures({ columnFilteringFeature, filteredRowModel: createFilteredRowModel() })
			createTableOptions({ features: noFns, data: rows, columns, filtering: true })

			expect(warnings()).toHaveLength(1)
			expect(warnings()[0]).toContain('a column filter')
			expect(warnings()[0]).toContain('`filterFns` is not in `features`')
			expect(warnings()[0]).toContain('no row is ever filtered out')
		})

		it('stays quiet when every column resolved an operator dispatcher', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			// `mapColumns` gives a column with operators an inline `filterFn`, so no name is
			// resolved and the slot is genuinely not needed. A guard that fired here would be
			// telling the consumer to register something their table never reads.
			const noFns = tableFeatures({ columnFilteringFeature, filteredRowModel: createFilteredRowModel() })
			createTableOptions({ features: noFns, data: rows, columns, filtering: { operators: true } })

			expect(warnings()).toHaveLength(0)
		})

		it('warns when global search falls back to the `includesString` name', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			const noFns = tableFeatures({
				columnFilteringFeature,
				globalFilteringFeature,
				filteredRowModel: createFilteredRowModel(),
			})
			createTableOptions({ features: noFns, data: rows, columns, globalFiltering: true })

			expect(warnings()).toHaveLength(1)
			expect(warnings()[0]).toContain('`globalFiltering`')
			expect(warnings()[0]).toContain('`filterFns` is not in `features`')
		})

		it('stays quiet when global search was given an inline function', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			const noFns = tableFeatures({
				columnFilteringFeature,
				globalFilteringFeature,
				filteredRowModel: createFilteredRowModel(),
			})
			createTableOptions({
				features: noFns,
				data: rows,
				columns,
				globalFiltering: { fn: (() => true) as never },
			})

			expect(warnings()).toHaveLength(0)
		})

		it('names both axes in one warning when both resolve a name', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			const noFns = tableFeatures({
				columnFilteringFeature,
				globalFilteringFeature,
				filteredRowModel: createFilteredRowModel(),
			})
			createTableOptions({ features: noFns, data: rows, columns, filtering: true, globalFiltering: true })

			expect(warnings()).toHaveLength(1)
			expect(warnings()[0]).toContain('a column filter and `globalFiltering`')
		})

		it('stays quiet when `filterFns` is registered', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			const complete = tableFeatures({
				columnFilteringFeature,
				globalFilteringFeature,
				filteredRowModel: createFilteredRowModel(),
				filterFns,
			})
			createTableOptions({ features: complete, data: rows, columns, filtering: true, globalFiltering: true })

			expect(warnings()).toHaveLength(0)
		})

		it('still warns for a top-level option whose feature is absent', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			createTableOptions({ features: filteringOnly, data: rows, columns, sorting: true })

			expect(warnings()).toHaveLength(1)
			expect(warnings()[0]).toContain('`sorting` is configured, but `rowSortingFeature` is not in `features`')
		})

		// ── the grid's own features ──────────────────────────────────────────
		// Under v9 a feature left out of `tableFeatures({…})` contributes no state slice and no
		// table API, so every one of these configs used to produce a grid missing the thing it
		// asked for, with no diagnostic. `creating` and `editing` are plain `REQUIRED_FEATURE`
		// entries; the other three need a predicate, which is what CONDITIONAL_REQUIRED_FEATURES
		// and the second guard are for.

		it.each([
			['creating', { creating: { onSave: () => Promise.resolve() } }, 'creatingFeature'],
			['editing', { editing: { onSave: () => Promise.resolve() } }, 'editingFeature'],
			['deleting', { deleting: { onDelete: () => undefined } }, 'deletingFeature'],
			// `sorting: { manual: true }` is the prerequisite `draft` throws without, not part of
			// what is being asserted — `features` already carries `rowSortingFeature`, so it trips
			// no other entry.
			['draft', { draft: true, sorting: { manual: true } }, 'draftFeature'],
			['ordering.row', { ordering: { row: true } }, 'rowOrderingFeature'],
			["pagination.mode: 'infinite'", { pagination: { mode: 'infinite' } }, 'infiniteFeature'],
			['initialState.loading', { initialState: { loading: { isPending: true } } }, 'loadingFeature'],
		] as const)('warns that the config asking for `%s` needs its feature', (option, extra, feature) => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			// `features` carries pagination and sorting, so the `pagination.mode` case does not
			// also trip the `pagination` → `rowPaginationFeature` entry and muddy the count.
			createTableOptions({ features, data: rows, columns, ...extra } as Parameters<typeof createTableOptions>[0])

			const named = warnings().filter((w) => w.includes(`\`${feature}\` is not in \`features\``))
			expect(named).toHaveLength(1)
			expect(named[0]).toContain(`\`${option}\` is configured`)
		})

		it('warns for an external `atoms.loading` with no `loadingFeature`', () => {
			// The second of loading's two asks. The slice is fully user-owned, so supplying the
			// atom *is* the configuration — there is no `loading` key on TableConfig to key it by.
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			createTableOptions({ features, data: rows, columns }, {
				atoms: { loading: { get: () => undefined, set: () => undefined } },
			} as unknown as Parameters<typeof createTableOptions>[1])

			expect(warnings()).toHaveLength(1)
			expect(warnings()[0]).toContain('`atoms.loading` is configured, but `loadingFeature` is not in `features`')
		})

		it('does not demand `rowOrderingFeature` from a grid that only reorders columns', () => {
			// The false positive that keeps `ordering` out of REQUIRED_FEATURE: a bare
			// `ordering: true` means columns only, so keying the whole option by the row feature
			// would fire on the commonest configuration.
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			createTableOptions({ features, data: rows, columns, ordering: true })
			createTableOptions({ features, data: rows, columns, ordering: { column: true } })

			expect(warnings()).toHaveLength(0)
		})

		it('stays silent when every grid-own feature the config asks for is registered', () => {
			// The half that stops all six from being guards that always fire. Same config as the
			// six cases above, in one table, with the features present.
			vi.spyOn(console, 'warn').mockImplementation(() => undefined)

			const complete = tableFeatures({
				rowSortingFeature,
				rowPaginationFeature,
				sortedRowModel: createSortedRowModel(),
				// No `paginatedRowModel`: infinite mode shows every accumulated row, and
				// registering the slice-to-one-page model beside it trips a different,
				// pre-existing warning. Leaving it out is both correct for the mode and what lets
				// this case assert that **nothing at all** was logged.
				creatingFeature,
				editingFeature,
				deletingFeature,
				rowOrderingFeature,
				infiniteFeature,
				loadingFeature,
				draftFeature,
			})

			createTableOptions(
				{
					features: complete,
					data: rows,
					columns,
					creating: { onSave: () => Promise.resolve() },
					editing: { onSave: () => Promise.resolve() },
					draft: true,
					sorting: { manual: true },
					deleting: { onDelete: () => undefined },
					ordering: { row: true },
					pagination: { mode: 'infinite' },
					initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } },
				} as Parameters<typeof createTableOptions>[0],
				{ atoms: { loading: { get: () => undefined, set: () => undefined } } } as unknown as Parameters<
					typeof createTableOptions
				>[1],
			)

			expect(warnings()).toHaveLength(0)
		})
	})

	it('throws when draft is on without a manual axis', () => {
		expect(() => createTableOptions({ features, data: rows, columns, draft: true })).toThrow(/manual/)
	})
})
