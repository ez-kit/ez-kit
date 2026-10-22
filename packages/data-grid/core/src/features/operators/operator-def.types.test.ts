import { describe, expectTypeOf, it } from 'vitest'

import { OperatorInput } from './operators'

import type { BetweenValue, FilterOperatorDef } from './operators'

describe('FilterOperatorDef', () => {
	it('rejects a definition without `input`', () => {
		// @ts-expect-error `input` is the discriminant every definition states
		const missing: FilterOperatorDef = { id: 'fuzzy', label: 'Fuzzy', filterFn: () => true }
		expectTypeOf(missing).toEqualTypeOf<FilterOperatorDef>()
	})

	it('types `filterFn`’s value by `input`', () => {
		const range: FilterOperatorDef<number> = {
			id: 'notBetween',
			label: 'Not between',
			input: OperatorInput.Range,
			filterFn: (_rowValue, value) => {
				expectTypeOf(value).toEqualTypeOf<BetweenValue<number>>()
				return true
			},
		}
		const list: FilterOperatorDef<string> = {
			id: 'excludesAny',
			label: 'Excludes any',
			input: OperatorInput.List,
			filterFn: (_rowValue, value) => {
				expectTypeOf(value).toEqualTypeOf<readonly string[]>()
				return true
			},
		}
		const single: FilterOperatorDef<string> = {
			id: 'fuzzy',
			label: 'Fuzzy',
			input: OperatorInput.Single,
			filterFn: (_rowValue, value) => {
				expectTypeOf(value).toEqualTypeOf<string>()
				return true
			},
		}
		expectTypeOf([range, list, single]).toExtend<FilterOperatorDef[]>()
	})

	it('assigns a typed definition into an untyped set without a cast', () => {
		const atLeast: FilterOperatorDef<number> = {
			id: 'atLeast',
			label: 'At least',
			input: OperatorInput.Single,
			filterFn: (rowValue, value) => Number(rowValue) >= value,
		}
		const set: FilterOperatorDef[] = [atLeast]
		expectTypeOf(set).toEqualTypeOf<FilterOperatorDef[]>()
	})
})
