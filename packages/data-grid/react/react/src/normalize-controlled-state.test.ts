import { describe, expect, it } from 'vitest'

import { describeUnrecognisedLoading, normalizeControlledState } from './normalize-controlled-state'

const DEFAULT_LOADING = { isPending: false, isFetching: false, isError: false, error: null }

describe('normalizeControlledState', () => {
	it('passes an absent state through', () => {
		expect(normalizeControlledState(undefined, undefined)).toBeUndefined()
	})

	it('passes a state without `loading` through as given', () => {
		const state = { sorting: [{ id: 'name', desc: false }] }

		expect(normalizeControlledState(undefined, state)).toBe(state)
	})

	it('fills the fields a partial `loading` leaves out from the defaults', () => {
		const normalized = normalizeControlledState(undefined, { loading: { isPending: true } })

		expect(normalized?.loading).toEqual({ ...DEFAULT_LOADING, isPending: true })
	})

	it('turns an empty `loading` into the defaults', () => {
		expect(normalizeControlledState(undefined, { loading: {} })?.loading).toEqual(DEFAULT_LOADING)
	})

	it('keeps the other slices of the state', () => {
		const sorting = [{ id: 'name', desc: false }]

		expect(normalizeControlledState(undefined, { sorting, loading: {} })?.sorting).toBe(sorting)
	})

	it('narrows `loading` to the four fields the slice knows', () => {
		const query = { isPending: false, isFetching: true, isError: false, error: null, data: [1, 2], status: 'success' }

		expect(normalizeControlledState(undefined, { loading: query })?.loading).toEqual({
			isPending: false,
			isFetching: true,
			isError: false,
			error: null,
		})
	})

	it('keeps an explicit undefined error rather than replacing it with null', () => {
		expect(normalizeControlledState(undefined, { loading: { error: undefined } })?.loading).toHaveProperty(
			'error',
			undefined,
		)
	})

	it('reuses the previous `loading` while its four fields are equal', () => {
		const previous = normalizeControlledState(undefined, { loading: { isPending: true } })

		const next = normalizeControlledState(previous, { loading: { isPending: true, isError: false } })

		expect(next?.loading).toBe(previous?.loading)
	})

	it('builds a new `loading` once a field changes', () => {
		const previous = normalizeControlledState(undefined, { loading: { isPending: true } })

		const next = normalizeControlledState(previous, { loading: { isPending: false } })

		expect(next?.loading).not.toBe(previous?.loading)
		expect(next?.loading).toEqual(DEFAULT_LOADING)
	})
})

describe('describeUnrecognisedLoading', () => {
	it('names the foreign keys of an object carrying none of the flags', () => {
		const swr = { isLoading: true, isValidating: false, error: undefined, data: undefined }

		expect(describeUnrecognisedLoading(swr)).toMatch(/state\.loading.*"isLoading", "isValidating", "data".*isPending/s)
	})

	it.each([
		['an empty object', {}],
		['an error alone', { error: new Error('boom') }],
		['a single flag', { isPending: true }],
		['a query-shaped result', { isPending: true, isFetching: false, isError: false, error: null, data: [] }],
	])('recognises %s', (_name, loading) => {
		expect(describeUnrecognisedLoading(loading)).toBeUndefined()
	})
})
