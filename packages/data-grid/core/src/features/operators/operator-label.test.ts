import { afterEach, describe, expect, it, vi } from 'vitest'

import { defaultMessages, resolveMessages } from '../../messages'

import { resolveOperatorLabels, resolveOperatorLabel } from './operators'

import type { FilterOperatorDef } from './operators'

const english = defaultMessages.operators

function def(overrides: Partial<FilterOperatorDef> & Pick<FilterOperatorDef, 'id'>): FilterOperatorDef {
	return { input: 'single', filterFn: () => true, ...overrides }
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('resolveOperatorLabel', () => {
	it('uses the definition’s own label over the dictionary', () => {
		const russian = resolveMessages({ operators: { common: { equals: 'Равно' } } }).operators

		expect(resolveOperatorLabel(def({ id: 'equals', label: 'Точно' }), russian)).toBe('Точно')
	})

	it('reads the group the definition names', () => {
		expect(resolveOperatorLabel(def({ id: 'greaterThan', labels: 'date' }), english)).toBe('After')
		expect(resolveOperatorLabel(def({ id: 'equals', labels: 'boolean' }), english)).toBe('Is')
	})

	it('falls back to `common` without a group', () => {
		expect(resolveOperatorLabel(def({ id: 'greaterThan' }), english)).toBe('Greater than')
	})

	it('falls back to `common` when the group has no entry for the id', () => {
		expect(resolveOperatorLabel(def({ id: 'between', labels: 'date' }), english)).toBe('Between')
	})

	it('shows the id and warns once when nothing names the operator', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		expect(resolveOperatorLabel(def({ id: 'fuzzyUnlabelled' }), english)).toBe('fuzzyUnlabelled')
		expect(resolveOperatorLabel(def({ id: 'fuzzyUnlabelled' }), english)).toBe('fuzzyUnlabelled')

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toContain('"fuzzyUnlabelled"')
	})

	it('does not take an inherited member for a label', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		expect(resolveOperatorLabel(def({ id: 'toString' }), english)).toBe('toString')
	})

	it('reads an overridden entry of one group and keeps the rest of it', () => {
		const messages = resolveMessages({ operators: { date: { greaterThan: 'Позже' } } }).operators

		expect(resolveOperatorLabel(def({ id: 'greaterThan', labels: 'date' }), messages)).toBe('Позже')
		expect(resolveOperatorLabel(def({ id: 'lessThan', labels: 'date' }), messages)).toBe('Before')
	})
})

describe('resolveOperatorLabels', () => {
	it('gives every operator its resolved label', () => {
		const operators = [def({ id: 'contains' }), def({ id: 'greaterThan', labels: 'date' })]

		expect(resolveOperatorLabels(operators, english).map((op) => op.label)).toEqual(['Contains', 'After'])
	})

	it('returns the list by reference when every operator already carries its label', () => {
		const operators = [def({ id: 'contains', label: 'Contains' })]

		expect(resolveOperatorLabels(operators, english)).toBe(operators)
	})

	it('keeps an operator by reference when its label is unchanged', () => {
		const labelled = def({ id: 'contains', label: 'Contains' })
		const localized = resolveOperatorLabels([labelled, def({ id: 'equals' })], english)

		expect(localized[0]).toBe(labelled)
		expect(localized[1]?.label).toBe('Equals')
	})
})
