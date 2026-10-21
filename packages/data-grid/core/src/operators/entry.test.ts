import { describe, expect, it } from 'vitest'

import * as root from '../index'

import * as operators from './entry'

describe('@ez-kit/data-grid-core/operators', () => {
	it('exports the ready-made set and the constants named after its ids, and nothing else', () => {
		expect(Object.keys(operators).sort()).toEqual(['DEFAULT_OPERATOR_ICONS', 'FilterOperator', 'defaultOperators'])
	})

	it('leaves none of them on the main entry, which keeps only what operators are made of', () => {
		const names = Object.keys(root)

		for (const moved of [
			'FilterOperator',
			'DEFAULT_OPERATOR_ICONS',
			'defaultOperators',
			'DEFAULT_OPERATORS_BY_TYPE',
			'DEFAULT_OPERATOR_ID_BY_TYPE',
			'TEXT_OPERATORS',
			'localizeOperators',
			'buildOperatorRegistry',
		]) {
			expect(names, moved).not.toContain(moved)
		}
		expect(names).toContain('OperatorInput')
	})
})
