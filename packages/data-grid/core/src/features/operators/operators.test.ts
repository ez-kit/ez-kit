import { describe, expect, it } from 'vitest'

import { DEFAULT_OPERATOR_ICONS as PackageRootIcons } from '../../index'

import {
	DATE_RANGE_PRESETS,
	DEFAULT_OPERATOR_ICONS,
	DEFAULT_OPERATOR_ID_BY_TYPE,
	DEFAULT_OPERATORS_BY_TYPE,
	FilterOperator,
	IN_OPERATORS,
	NUMBER_OPERATORS,
	TEXT_OPERATORS,
	buildOperatorRegistry,
	createOperatorFilterFn,
	resolveColumnOperators,
} from './operators'

import type { FilterOperatorDef } from './operators'

describe('IN_OPERATORS', () => {
	it('"in" matches when row value is included in the filter array', () => {
		const op = IN_OPERATORS.find((o) => o.id === 'in')
		if (!op) throw new Error('expected `in` operator')
		expect(op.filterFn('a', ['a', 'b'])).toBe(true)
		expect(op.filterFn('c', ['a', 'b'])).toBe(false)
	})

	it('"in" coerces non-string row values via String()', () => {
		const op = IN_OPERATORS.find((o) => o.id === 'in')
		if (!op) throw new Error('expected `in` operator')
		expect(op.filterFn(1, ['1', '2'])).toBe(true)
		expect(op.filterFn(true, ['true'])).toBe(true)
	})

	it('"in" treats null/undefined row values as empty string (no match)', () => {
		const op = IN_OPERATORS.find((o) => o.id === 'in')
		if (!op) throw new Error('expected `in` operator')
		expect(op.filterFn(null, ['a'])).toBe(false)
		expect(op.filterFn(undefined, ['a'])).toBe(false)
	})

	it('"notIn" inverts "in"', () => {
		const op = IN_OPERATORS.find((o) => o.id === 'notIn')
		if (!op) throw new Error('expected `notIn` operator')
		expect(op.filterFn('a', ['a', 'b'])).toBe(false)
		expect(op.filterFn('c', ['a', 'b'])).toBe(true)
	})

	it('returns true (no-op) for empty filter arrays — both `in` and `notIn`', () => {
		const inOp = IN_OPERATORS.find((o) => o.id === 'in')
		const notInOp = IN_OPERATORS.find((o) => o.id === 'notIn')
		if (!inOp || !notInOp) throw new Error('expected operators')
		expect(inOp.filterFn('a', [])).toBe(true)
		expect(notInOp.filterFn('a', [])).toBe(true)
	})
})

describe('DEFAULT_OPERATORS_BY_TYPE for select / badge', () => {
	it('includes `in` and `notIn` plus isEmpty variants', () => {
		for (const type of ['select', 'badge']) {
			const ops = DEFAULT_OPERATORS_BY_TYPE[type]
			if (!ops) throw new Error(`expected operators for ${type}`)
			const ids = ops.map((o) => o.id)
			expect(ids).toEqual(['in', 'notIn', 'isEmpty', 'isNotEmpty'])
		}
	})

	it('defaults operator id to "in" for select and badge', () => {
		expect(DEFAULT_OPERATOR_ID_BY_TYPE.select).toBe('in')
		expect(DEFAULT_OPERATOR_ID_BY_TYPE.badge).toBe('in')
	})
})

describe('buildOperatorRegistry + resolveColumnOperators', () => {
	it('includes built-in `in` / `notIn` in the global registry', () => {
		const registry = buildOperatorRegistry()
		expect(registry.get('in')).toBeDefined()
		expect(registry.get('notIn')).toBeDefined()
	})

	it('resolveColumnOperators returns cell-type operators when config is `true`', () => {
		const registry = buildOperatorRegistry()
		const selectOps = DEFAULT_OPERATORS_BY_TYPE.select
		const resolved = resolveColumnOperators(true, registry, selectOps)
		expect(resolved.map((o) => o.id)).toEqual(['in', 'notIn', 'isEmpty', 'isNotEmpty'])
	})
})

describe('DEFAULT_OPERATOR_ICONS', () => {
	it('is exported from the package root', () => {
		expect(PackageRootIcons).toBe(DEFAULT_OPERATOR_ICONS)
	})

	it('gives every built-in operator a non-empty sign', () => {
		for (const id of Object.values(FilterOperator)) {
			expect(DEFAULT_OPERATOR_ICONS[id]).toMatch(/\S/)
		}
	})

	it('uses one sign per comparison, whatever the cell type calls it', () => {
		expect(DEFAULT_OPERATOR_ICONS).toMatchObject({
			contains: '*a*',
			startsWith: 'a*',
			endsWith: '*a',
			equals: '=',
			notEquals: '≠',
			greaterThan: '>',
			greaterOrEqual: '≥',
			lessThan: '<',
			lessOrEqual: '≤',
			between: '↔',
			in: '∈',
			notIn: '∉',
			isEmpty: '∅',
			isNotEmpty: '≠∅',
		})
	})
})

describe('table registry overrides a built-in operator', () => {
	const accentInsensitive: FilterOperatorDef = {
		id: FilterOperator.Contains,
		label: 'Похоже на',
		filterFn: () => true,
	}
	const sharedEquals: FilterOperatorDef = { id: FilterOperator.Equals, label: 'Same as', filterFn: () => true }

	it('reaches the default set of a cell type', () => {
		const registry = buildOperatorRegistry([accentInsensitive])
		const resolved = resolveColumnOperators(true, registry, TEXT_OPERATORS as FilterOperatorDef[])
		expect(resolved.find((op) => op.id === FilterOperator.Contains)).toBe(accentInsensitive)
		expect(resolved.find((op) => op.id === FilterOperator.Equals)).toBe(TEXT_OPERATORS[1])
	})

	it('reaches a column that names the id, and leaves the ids it does not override built-in', () => {
		const registry = buildOperatorRegistry([accentInsensitive])
		const resolved = resolveColumnOperators(
			{ items: [FilterOperator.Contains, FilterOperator.Equals] },
			registry,
			TEXT_OPERATORS as FilterOperatorDef[],
		)
		expect(resolved[0]).toBe(accentInsensitive)
		expect(resolved[1]).toBe(TEXT_OPERATORS[1])
	})

	it('applies to every cell type that offers the id', () => {
		const registry = buildOperatorRegistry([sharedEquals])
		for (const type of ['text', 'number', 'date', 'boolean']) {
			const resolved = resolveColumnOperators(true, registry, DEFAULT_OPERATORS_BY_TYPE[type])
			expect(resolved.find((op) => op.id === FilterOperator.Equals)).toBe(sharedEquals)
		}
		const numberColumn = resolveColumnOperators(
			{ items: [FilterOperator.Equals] },
			registry,
			NUMBER_OPERATORS as FilterOperatorDef[],
		)
		expect(numberColumn[0]).toBe(sharedEquals)
	})

	it('leaves the default sets untouched when the table overrides nothing', () => {
		const fuzzy: FilterOperatorDef = { id: 'fuzzy', label: 'Fuzzy', filterFn: () => true }
		const registry = buildOperatorRegistry([fuzzy])
		const textOperators = TEXT_OPERATORS as FilterOperatorDef[]
		expect(resolveColumnOperators(true, registry, textOperators)).toBe(textOperators)
		expect(resolveColumnOperators({ items: ['fuzzy', FilterOperator.Equals] }, registry, textOperators)).toEqual([
			fuzzy,
			TEXT_OPERATORS[1],
		])
	})
})

describe('createOperatorFilterFn — empty-array guard', () => {
	it('returns true when filter value is an empty array', () => {
		const registry = buildOperatorRegistry()
		const inOp = registry.get('in')
		if (!inOp) throw new Error('expected `in` operator')
		const fn = createOperatorFilterFn([inOp] as FilterOperatorDef[])
		const row = { getValue: () => 'a' }
		expect(fn(row, 'col', { operator: 'in', value: [] })).toBe(true)
	})

	it('applies the operator filterFn when array has entries', () => {
		const registry = buildOperatorRegistry()
		const inOp = registry.get('in')
		if (!inOp) throw new Error('expected `in` operator')
		const fn = createOperatorFilterFn([inOp] as FilterOperatorDef[])
		const row = { getValue: () => 'a' }
		expect(fn(row, 'col', { operator: 'in', value: ['a'] })).toBe(true)
		expect(fn(row, 'col', { operator: 'in', value: ['b'] })).toBe(false)
	})
})

describe('DATE_RANGE_PRESETS', () => {
	// Anchor: 2026-05-14 UTC (a Thursday in mid-month — exercises month/week edges).
	const NOW = new Date('2026-05-14T00:00:00Z')

	const findPreset = (id: string) => {
		const p = DATE_RANGE_PRESETS.find((x) => x.id === id)
		if (!p) throw new Error(`expected preset ${id}`)
		return p
	}

	it('today → { from: today, to: today }', () => {
		expect(findPreset('today').getRange(NOW)).toEqual({ from: '2026-05-14', to: '2026-05-14' })
	})

	it('yesterday → { from: yesterday, to: yesterday }', () => {
		expect(findPreset('yesterday').getRange(NOW)).toEqual({ from: '2026-05-13', to: '2026-05-13' })
	})

	it('last7 → from = 6 days back, to = today (inclusive 7-day window)', () => {
		expect(findPreset('last7').getRange(NOW)).toEqual({ from: '2026-05-08', to: '2026-05-14' })
	})

	it('last30 → from = 29 days back, to = today (inclusive 30-day window)', () => {
		expect(findPreset('last30').getRange(NOW)).toEqual({ from: '2026-04-15', to: '2026-05-14' })
	})

	it('thisMonth → from = first of month, to = last day of month', () => {
		expect(findPreset('thisMonth').getRange(NOW)).toEqual({ from: '2026-05-01', to: '2026-05-31' })
	})

	it('lastMonth → from = first of previous month, to = last day of previous month', () => {
		expect(findPreset('lastMonth').getRange(NOW)).toEqual({ from: '2026-04-01', to: '2026-04-30' })
	})

	it('lastMonth across year boundary (January)', () => {
		const jan = new Date('2026-01-15T00:00:00Z')
		expect(findPreset('lastMonth').getRange(jan)).toEqual({ from: '2025-12-01', to: '2025-12-31' })
	})

	it('built-in preset list has stable id + label per spec', () => {
		expect(DATE_RANGE_PRESETS.map((p) => p.id)).toEqual([
			'today',
			'yesterday',
			'last7',
			'last30',
			'thisMonth',
			'lastMonth',
		])
	})
})
