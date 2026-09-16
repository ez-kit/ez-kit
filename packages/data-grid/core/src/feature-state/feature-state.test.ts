import {
	columnFilteringFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	constructTable,
	globalFilteringFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../column/create-columns'
import { createTable, createTableOptions } from '../create-table'

import { readForeignSlice, readOwnSlice, writeForeignSlice, writeOwnSlice } from './feature-state'

import type { ExternalAtoms, RowSelectionState, TableFeatures, TableOptions } from '@tanstack/table-core'

/**
 * A custom feature's own slice, declared the way Tasks 8-12 must declare theirs.
 *
 * `SliceKey` is `keyof TableState_All`, and upstream's custom-feature skill augments only
 * `TableState_FeatureMap` — which feeds `TableState<TFeatures>`, **not** `TableState_All`. A
 * feature that augments just the feature map therefore cannot name its own slice here at all, so
 * every ported feature has to augment `TableState_All` as well. This is that augmentation, and
 * the compile-time case below is what keeps the arrangement from silently regressing: without it
 * the own-slice pair is only ever exercised against stock slices, which is not what it is for.
 */
declare module '@tanstack/table-core' {
	// Declaration merging needs an interface; the repo's feature augmentations disable this rule
	// the same way.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface TableState_All {
		featureStateProbe?: { readonly ticks: number }
	}
}

type Row = { name: string }

const DATA: Row[] = [{ name: 'Ada' }]
const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

const SORTING = tableFeatures({ rowSortingFeature })
const SORTING_AND_SELECTION = tableFeatures({ rowSortingFeature, rowSelectionFeature })

/** Every stock feature that owns a state slice — the widest set the naming case can check. */
const ALL_STOCK = tableFeatures({
	columnFilteringFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	rowExpandingFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
})

/**
 * A table seen the way the four accessors see one — the two atom bags and nothing else.
 *
 * The shadowing that once forced this — seven v8 `declare module '@tanstack/table-core'` blocks
 * that made `DataTable` an error type — is gone, and `createTable` returns a real v9 `Table`. The
 * cast stays because it is the module's own claim rather than a workaround: the four accessors
 * exist precisely so a feature can reach state through **less** than a table, and naming that
 * "less" here is what the cases below are written against. `baseAtoms` is also the one bag whose
 * per-slice shape a `TFeatures`-generic table cannot give them.
 */
type FeatureTable = {
	readonly options: { readonly atoms?: object | undefined } & Record<string, unknown>
	readonly baseAtoms: Record<string, { get: () => unknown; set: (value: unknown) => void } | undefined>
}

const asFeatureTable = (table: unknown): FeatureTable => table as FeatureTable

/**
 * Construct a table the way `createTable` does, but with a per-slice external atom attached.
 *
 * `createTable` takes no `externals` — that parameter is `createTableOptions`' — and the public
 * config is deliberately **not** widened to make this test convenient, so the test assembles the
 * two halves itself. The feature spread mirrors `create-table.ts` exactly: the vanilla reactivity
 * binding first, the caller's set after.
 */
function constructWithExternalAtoms<TFeatures extends TableFeatures>(
	features: TFeatures,
	atoms: ExternalAtoms<TFeatures>,
) {
	const { options } = createTableOptions({ features, data: DATA, columns: COLUMNS, selection: true }, { atoms })
	return asFeatureTable(
		constructTable({
			...options,
			features: { coreReactivityFeature: storeReactivityBindings(), ...options.features },
		} as unknown as TableOptions<TFeatures, Row>),
	)
}

/** A real `@tanstack/store` atom, reached through the binding table-core already re-exports. */
function externalAtom<T>(initial: T) {
	return storeReactivityBindings().createWritableAtom<T>(initial)
}

describe('feature-state', () => {
	it('reads and writes a registered slice', () => {
		const table = asFeatureTable(createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: true }))

		expect(readOwnSlice(table, 'sorting')).toEqual([])

		writeOwnSlice(table, 'sorting', [{ id: 'name', desc: true }])
		expect(readOwnSlice(table, 'sorting')).toEqual([{ id: 'name', desc: true }])
	})

	it('accepts the functional updater form', () => {
		const table = asFeatureTable(createTable({ features: SORTING, data: DATA, columns: COLUMNS, sorting: true }))

		writeOwnSlice(table, 'sorting', (prev) => [...prev, { id: 'name', desc: false }])
		expect(readOwnSlice(table, 'sorting')).toEqual([{ id: 'name', desc: false }])
	})

	it('readForeignSlice returns undefined for an unregistered slice, readOwnSlice throws', () => {
		const table = asFeatureTable(createTable({ features: SORTING, data: DATA, columns: COLUMNS }))

		expect(readForeignSlice(table, 'rowSelection')).toBeUndefined()
		expect(() => readOwnSlice(table, 'rowSelection')).toThrow(/rowSelection/)
	})

	it('writeForeignSlice is a no-op for an unregistered slice', () => {
		const table = asFeatureTable(createTable({ features: SORTING, data: DATA, columns: COLUMNS }))

		expect(() => {
			writeForeignSlice(table, 'rowSelection', {})
		}).not.toThrow()
		expect(readForeignSlice(table, 'rowSelection')).toBeUndefined()
	})

	// The other half of the asymmetry: an own slice that is missing means the feature's
	// `getInitialState` failed to seed it, which is a bug the author must see — so `writeOwnSlice`
	// must NOT swallow it. Matched on the slice name and the package prefix, not a bare `.toThrow()`:
	// left unmatched this would also have passed against the opaque
	// `TypeError: Cannot read properties of undefined (reading 'set')` that `makeStateUpdater`
	// raises from `node_modules` for the same condition, naming neither the slice nor the feature.
	it('writeOwnSlice throws, naming the slice, for an unregistered slice rather than no-opping', () => {
		const table = asFeatureTable(createTable({ features: SORTING, data: DATA, columns: COLUMNS }))

		expect(() => {
			writeOwnSlice(table, 'rowSelection', {})
		}).toThrow(/\[data-grid\] state slice "rowSelection" is missing/)
	})

	// Both halves of the own pair fail the same way for the same condition.
	it('readOwnSlice and writeOwnSlice report an absent slice identically', () => {
		const table = asFeatureTable(createTable({ features: SORTING, data: DATA, columns: COLUMNS }))

		const read = (): unknown => readOwnSlice(table, 'rowSelection')
		const write = (): void => {
			writeOwnSlice(table, 'rowSelection', {})
		}

		expect(read).toThrow(Error)
		expect(write).toThrow(Error)

		let readMessage = ''
		let writeMessage = ''
		try {
			read()
		} catch (error: unknown) {
			readMessage = error instanceof Error ? error.message : String(error)
		}
		try {
			write()
		} catch (error: unknown) {
			writeMessage = error instanceof Error ? error.message : String(error)
		}

		expect(writeMessage).toBe(readMessage)
		expect(readMessage).toContain('[data-grid]')
	})

	// `readForeignSlice` guards `atoms`; `writeForeignSlice` guards `baseAtoms`. They are equivalent
	// only because `constructTable` fills both from one key list (`Object.keys(table.initialState)`,
	// `constructTable.js:86-89`) — an upstream invariant nothing in this repo asserted. If it ever
	// diverged, a slice could read as present and be silently dropped by the writer: this
	// migration's signature defect, inside the module built to prevent it.
	it('the two atom bags carry identical key sets', () => {
		const table = asFeatureTable(createTable({ features: ALL_STOCK, data: DATA, columns: COLUMNS }))
		const bags = table as unknown as { atoms: Record<string, unknown>; baseAtoms: Record<string, unknown> }

		const readable = Object.keys(bags.atoms).sort()
		const writable = Object.keys(bags.baseAtoms).sort()

		expect(readable.length).toBeGreaterThan(0)
		expect(writable).toEqual(readable)
	})

	// The rule this module exists to enforce. `baseAtoms` is NOT the owning atom when the consumer
	// supplied one, so a write that reached for it directly would go nowhere — silently.
	it('writeForeignSlice writes through a consumer-supplied external atom', () => {
		const external = externalAtom<RowSelectionState>({ a: true })
		const table = constructWithExternalAtoms(SORTING_AND_SELECTION, { rowSelection: external })

		expect(readForeignSlice(table, 'rowSelection')).toEqual({ a: true })

		writeForeignSlice(table, 'rowSelection', {})

		expect(external.get()).toEqual({})
		expect(readForeignSlice(table, 'rowSelection')).toEqual({})
	})

	// The negative control for the case above: with an external atom attached, `baseAtoms` is a
	// live atom that still holds the seed, so a write aimed at it would "succeed" and change
	// nothing anyone reads. This asserts the base atom is genuinely the wrong target — without it
	// the case above would pass on a table where both atoms happened to agree.
	it('the consumer-supplied atom, not baseAtoms, is what a read reflects', () => {
		const external = externalAtom<RowSelectionState>({ a: true })
		const table = constructWithExternalAtoms(SORTING_AND_SELECTION, { rowSelection: external })

		table.baseAtoms.rowSelection?.set({ b: true })

		expect(readForeignSlice(table, 'rowSelection')).toEqual({ a: true })
		expect(external.get()).toEqual({ a: true })
	})

	// Both writers go through `table.options.on<Slice>Change`, which is where `bindStateHandlers`
	// hangs the consumer's per-slice callback. Writing the atom directly through `makeStateUpdater`
	// would move the state and never call it — and Tasks 8-12 write exactly these slices
	// (`rowSelection`, `pagination`, `sorting`, `columnFilters`, `globalFilter`) from features that
	// under v8 moved them through `table.setState`, where the funnel did reach the callback.
	it('a write invokes the slice on-change option, and reaches the whole-state store', () => {
		const onSelectionChange = vi.fn()
		const onStateChange = vi.fn()
		const table = asFeatureTable(
			createTable({
				features: SORTING_AND_SELECTION,
				data: DATA,
				columns: COLUMNS,
				selection: { onChange: onSelectionChange },
				onStateChange,
			}),
		)

		expect(table.options.onRowSelectionChange).toBeTypeOf('function')

		writeForeignSlice(table, 'rowSelection', { a: true })

		expect(readForeignSlice(table, 'rowSelection')).toEqual({ a: true })
		expect(onSelectionChange).toHaveBeenCalledWith({ a: true }, ['a'])
		expect(onStateChange).toHaveBeenCalled()
	})

	// The invariant half of the same routing, and the half no consumer callback would reveal:
	// `bindStateHandlers` installs `onColumnVisibilityChange` whether or not the consumer asked
	// for a callback, because a column the grid forbids hiding must stay visible on *every* write,
	// not only on the seed. A write that reached the atom directly would bypass that.
	it('a write is subject to the column invariants the handler enforces', () => {
		const table = asFeatureTable(
			createTable({
				features: tableFeatures({ rowSortingFeature, columnVisibilityFeature }),
				data: DATA,
				// `visibility: false` on a column means "hiding disabled" — `buildColumnInvariants`
				// turns it into an `alwaysVisible` id.
				columns: createColumns<Row>([{ accessorKey: 'name', header: 'Name', visibility: false }]),
				visibility: true,
			}),
		)

		writeOwnSlice(table, 'columnVisibility', { name: false })

		// The invariant put it back: `canHide: false` means the column cannot be hidden.
		expect(readOwnSlice(table, 'columnVisibility').name).toBe(true)
	})

	// The routing derives the option name as `on<Slice>Change`. Asserted against every stock slice
	// the table actually registers rather than trusting the convention, because a slice whose
	// option is named differently would fall through to `makeStateUpdater` and lose the handler
	// silently — the exact failure the routing exists to prevent.
	it('derives the on-change option name for every registered stock slice', () => {
		const table = asFeatureTable(createTable({ features: ALL_STOCK, data: DATA, columns: COLUMNS }))
		const slices = Object.keys(table.baseAtoms)

		expect(slices.length).toBeGreaterThan(0)
		for (const slice of slices) {
			const option = `on${slice.charAt(0).toUpperCase()}${slice.slice(1)}Change`
			expect({ slice, handler: typeof table.options[option] }).toEqual({ slice, handler: 'function' })
		}
	})

	// A custom feature's own slice, end to end: seeded by `getInitialState`, then read and written
	// by name. The runtime half is the assertions; the compile-time half is that `'featureStateProbe'`
	// is accepted as a `SliceKey` at all and that `ticks` is typed — both fail to compile if the
	// `TableState_All` augmentation above is removed, or if `writeOwnSlice` loses the assertion that
	// keeps `makeStateUpdater`'s stock-only updater type from rejecting a custom slice.
	it('reads and writes a custom feature own slice', () => {
		const probeFeature = { getInitialState: (state: object) => ({ featureStateProbe: { ticks: 0 }, ...state }) }
		const table = asFeatureTable(
			createTable({
				// `as never` because this ad-hoc feature deliberately does not augment
				// `TableFeatures` / `TableState_FeatureMap` — a real ported feature will, and the
				// one augmentation under test here is the `TableState_All` half that `SliceKey`
				// reads. Scaffolding, not part of the accessor's contract.
				features: tableFeatures({ rowSortingFeature, probeFeature } as never),
				data: DATA,
				columns: COLUMNS,
			}),
		)

		expect(readOwnSlice(table, 'featureStateProbe')).toEqual({ ticks: 0 })

		writeOwnSlice(table, 'featureStateProbe', (prev) => ({ ticks: prev.ticks + 1 }))

		const next = readOwnSlice(table, 'featureStateProbe')
		// Typed, not `unknown`: `ticks` is a number because `SliceOf<'featureStateProbe'>` resolved.
		expect(next.ticks).toBe(1)
	})
})
