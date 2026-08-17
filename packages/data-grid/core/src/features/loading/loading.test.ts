import { describe, expect, it } from 'vitest'

import { createTable, createColumns } from '../../index'

import { INITIAL_LOADING_STATE, LoadingFeature } from './loading'

type Row = { id: number; name: string }

const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

describe('LoadingFeature — initial state', () => {
	it('seeds state.loading with flags false and error null', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.getSnapshot().loading).toEqual({
			isPending: false,
			isFetching: false,
			isError: false,
			error: null,
		})
	})

	it('INITIAL_LOADING_STATE constant matches the seeded slice', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.getSnapshot().loading).toEqual(INITIAL_LOADING_STATE)
	})

	it('exposes only getInitialState (no createTable side-effects)', () => {
		expect(typeof LoadingFeature.getInitialState).toBe('function')
		expect(LoadingFeature.createTable).toBeUndefined()
	})
})

describe('LoadingFeature — controlled merge', () => {
	it('seeds loading from initialState (uncontrolled default)', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			initialState: { loading: { isPending: true, isFetching: false, isError: false, error: null } },
		})
		expect(table.getSnapshot().loading.isPending).toBe(true)
	})

	it('mirrors the controlled loading slice one-way via syncControlledState', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		expect(table.getSnapshot().loading.isFetching).toBe(false)

		const boom = new Error('boom')
		table.syncControlledState({
			loading: { isPending: false, isFetching: true, isError: true, error: boom },
		})
		expect(table.getSnapshot().loading).toEqual({
			isPending: false,
			isFetching: true,
			isError: true,
			error: boom,
		})
	})
})

describe('LoadingFeature — no grid-owned writers', () => {
	it('has no setFetchingStatus writer (fully controlled slice)', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		// @ts-expect-error setFetchingStatus was removed — state.loading is fed via the controlled prop only
		expect(table.setFetchingStatus).toBeUndefined()
	})

	it('has no getIsLoading alias (consumer derives from state.loading)', () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		// @ts-expect-error getIsLoading was removed — read state.loading directly
		expect(table.getIsLoading).toBeUndefined()
	})
})
