import { OperatorInput } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { isEmptyFilterValue } from './filters-batch'
import { inputOf } from './operator-input'

import type { FilterOperatorDef } from '@ez-kit/data-grid-core'

const OPERATORS: FilterOperatorDef[] = [
	{ id: 'equals', label: 'Equals', input: OperatorInput.Single, filterFn: () => true },
	{ id: 'in', label: 'Is any of', input: OperatorInput.List, filterFn: () => true },
	{ id: 'isEmpty', label: 'Is empty', input: OperatorInput.None, filterFn: () => true },
]

describe('inputOf', () => {
	it('reads the input of an offered operator, and nothing for one the column does not offer', () => {
		expect(inputOf(OPERATORS, 'in')).toBe(OperatorInput.List)
		expect(inputOf(OPERATORS, 'missing')).toBeUndefined()
	})
})

describe('isEmptyFilterValue', () => {
	it('keeps an operator that takes no value', () => {
		expect(isEmptyFilterValue({ operator: 'isEmpty', value: undefined }, OPERATORS)).toBe(false)
	})

	it('keeps 0 and false', () => {
		expect(isEmptyFilterValue({ operator: 'equals', value: 0 }, OPERATORS)).toBe(false)
		expect(isEmptyFilterValue({ operator: 'equals', value: false }, OPERATORS)).toBe(false)
	})

	it('drops an empty set and a list value of the wrong shape', () => {
		expect(isEmptyFilterValue({ operator: 'in', value: [] }, OPERATORS)).toBe(true)
		expect(isEmptyFilterValue({ operator: 'in', value: 'open' }, OPERATORS)).toBe(true)
	})

	it('judges an operator the column does not offer by the value’s shape alone', () => {
		expect(isEmptyFilterValue({ operator: 'gone', value: 'x' }, OPERATORS)).toBe(false)
		expect(isEmptyFilterValue({ operator: 'gone', value: ['a'] }, OPERATORS)).toBe(false)
		expect(isEmptyFilterValue({ operator: 'gone', value: { from: 1 } }, OPERATORS)).toBe(false)
		expect(isEmptyFilterValue({ operator: 'gone', value: [] }, OPERATORS)).toBe(true)
		expect(isEmptyFilterValue({ operator: 'gone', value: {} }, OPERATORS)).toBe(true)
		expect(isEmptyFilterValue({ operator: 'gone', value: '' }, OPERATORS)).toBe(true)
	})
})
