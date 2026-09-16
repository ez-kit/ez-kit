import { constructTable, tableFeatures } from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import { describe, expect, it } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable, createTableOptions } from '../../create-table'

import { INITIAL_LOADING_STATE, loadingFeature } from './loading'

import type { LoadingState } from '../../types'
import type { TableOptions } from '@tanstack/table-core'

type Row = { id: number; name: string }

const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

const LOADING = tableFeatures({ loadingFeature })

/** The slice the table currently holds. From a test the feature set is resolved, so this reads
 * the atom directly — `../../feature-state` is for feature code, where it is not. */
const loadingOf = (table: { atoms: { loading: { get: () => LoadingState } } }): LoadingState =>
	table.atoms.loading.get()

const makeTable = (config: object = {}) => createTable({ features: LOADING, data: DATA, columns: COLUMNS, ...config })

describe('loadingFeature — initial state', () => {
	it('seeds state.loading with flags false and error null', () => {
		expect(loadingOf(makeTable())).toEqual({
			isPending: false,
			isFetching: false,
			isError: false,
			error: null,
		})
	})

	it('INITIAL_LOADING_STATE constant matches the seeded slice', () => {
		expect(loadingOf(makeTable())).toEqual(INITIAL_LOADING_STATE)
	})

	it('exposes only getInitialState — no table APIs and no instance data', () => {
		expect(typeof loadingFeature.getInitialState).toBe('function')
		expect(loadingFeature.constructTableAPIs).toBeUndefined()
		expect(loadingFeature.initTableInstanceData).toBeUndefined()
	})

	it('contributes no slice to a table that does not register it', () => {
		// The whole point of composing features per table: no `loadingFeature`, no `loading`
		// key in the state at all — not an empty one.
		const table = createTable({ features: tableFeatures({}), data: DATA, columns: COLUMNS })

		// @ts-expect-error — the `loading` atom belongs to `loadingFeature`; the directive is the
		// type half of the same claim the read makes at runtime.
		expect(table.atoms.loading).toBeUndefined()
	})
})

describe('loadingFeature — seeding and control', () => {
	it('seeds loading from initialState (uncontrolled default)', () => {
		const table = makeTable({
			initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } },
		})

		expect(loadingOf(table).isPending).toBe(true)
	})

	it('lets the consumer own the slice through an external atom', () => {
		// The successor to the deleted `syncControlledState` mirror: v9's own ownership model.
		// An atom the application supplies for `loading` takes precedence over the base atom, so
		// what the application writes is what the grid reads — and the grid never writes back,
		// because this feature installs no writer.
		const bindings = storeReactivityBindings()
		const owned = bindings.createWritableAtom<LoadingState>({ ...INITIAL_LOADING_STATE })
		const { options } = createTableOptions(
			{ features: LOADING, data: DATA, columns: COLUMNS },
			{ atoms: { loading: owned } },
		)
		const table = constructTable({
			...options,
			features: { coreReactivityFeature: bindings, ...options.features },
		} as unknown as TableOptions<typeof LOADING, Row>)

		expect(loadingOf(table).isFetching).toBe(false)

		const boom = new Error('boom')
		owned.set({ isPending: false, isFetching: true, isError: true, error: boom })

		expect(loadingOf(table)).toEqual({
			isPending: false,
			isFetching: true,
			isError: true,
			error: boom,
		})
	})
})

describe('loadingFeature — no grid-owned writers', () => {
	// The `@ts-expect-error` these three carried is back: it was dropped while `DataTable` still
	// resolved to `any`, where the directive reported as *unused* rather than asserting anything.
	// The slice is fully consumer-owned, and each directive is what makes "the grid ships no
	// writer for it" a compile-time claim rather than a runtime coincidence.
	it('has no setFetchingStatus writer (fully controlled slice)', () => {
		// @ts-expect-error — no such member on a table, with or without the feature
		expect(makeTable().setFetchingStatus).toBeUndefined()
	})

	it('has no getIsLoading alias (consumer derives from state.loading)', () => {
		// @ts-expect-error — no such member on a table, with or without the feature
		expect(makeTable().getIsLoading).toBeUndefined()
	})

	it('has no setLoading method', () => {
		// @ts-expect-error — no such member on a table, with or without the feature
		expect(makeTable().setLoading).toBeUndefined()
	})
})
