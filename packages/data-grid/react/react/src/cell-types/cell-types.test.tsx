import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithComponents } from '../test-utils'

import { booleanCellType } from './boolean'
import { formatNumber, numberCellType } from './number'
import { textCellType, truncateText } from './text'

import type { FieldState } from '@ez-kit/data-grid-core'
import type { ComponentType } from 'react'

function baseField<TConfig>(overrides: Partial<FieldState<TConfig>>): FieldState<TConfig> {
	return {
		id: 'f',
		value: undefined,
		onChange: () => {},
		onBlur: () => {},
		error: undefined,
		errors: [],
		isValidating: false,
		...overrides,
	}
}

describe('formatNumber', () => {
	it('formats with default Intl rules when no config', () => {
		expect(formatNumber(1234.5, { locale: 'en-US' })).toBe('1,234.5')
	})

	it('respects decimals (min === max)', () => {
		expect(formatNumber(1, { decimals: 2, locale: 'en-US' })).toBe('1.00')
		expect(formatNumber(1.2345, { decimals: 2, locale: 'en-US' })).toBe('1.23')
	})

	it('substitutes thousands / decimal separators when provided', () => {
		expect(formatNumber(1234567.89, { thousandsSeparator: ' ', decimalSeparator: ',', locale: 'en-US' })).toBe(
			'1 234 567,89',
		)
	})

	it('applies prefix and suffix', () => {
		expect(formatNumber(42, { prefix: '$', suffix: ' USD', locale: 'en-US' })).toBe('$42 USD')
	})
})

describe('truncateText', () => {
	it('returns the value unchanged when within maxLength', () => {
		expect(truncateText('hello', { maxLength: 10 })).toBe('hello')
	})

	it('truncates with default ellipsis when over maxLength', () => {
		expect(truncateText('hello world', { maxLength: 5 })).toBe('hello…')
	})

	it('respects ellipsis=false (no marker)', () => {
		expect(truncateText('hello world', { maxLength: 5, ellipsis: false })).toBe('hello')
	})

	it('respects custom ellipsis string', () => {
		expect(truncateText('hello world', { maxLength: 5, ellipsis: '...' })).toBe('hello...')
	})

	it('returns the value when no config is supplied', () => {
		expect(truncateText('anything')).toBe('anything')
	})
})

describe('numberCellType', () => {
	const view = numberCellType.view
	if (!view) throw new Error('numberCellType.view must be defined')

	it('view: formats numeric values via config', () => {
		const out = view({ value: 1500, row: {}, rowIndex: 0, config: { decimals: 2, locale: 'en-US' } })
		expect(out).toBe('1,500.00')
	})

	it('view: stringifies non-number values', () => {
		expect(view({ value: 'foo', row: {}, rowIndex: 0 })).toBe('foo')
		expect(view({ value: null, row: {}, rowIndex: 0 })).toBe('')
	})

	it('edit: forwards to DI NumberInput and onChange propagates a number', () => {
		const onChange = vi.fn()
		const Edit = numberCellType.edit as ComponentType<FieldState>
		const { container } = renderWithComponents(<Edit {...baseField<never>({ value: 1, onChange })} />)
		const input = container.querySelector('input[type="number"]')
		if (!input) throw new Error('expected NumberInput')
		fireEvent.change(input, { target: { value: '42' } })
		expect(onChange).toHaveBeenCalledWith(42)
	})
})

describe('textCellType', () => {
	const view = textCellType.view
	if (!view) throw new Error('textCellType.view must be defined')

	it('view: truncates with ellipsis when needed', () => {
		const out = view({ value: 'a long string', row: {}, rowIndex: 0, config: { maxLength: 5 } })
		expect(out).toBe('a lon…')
	})

	it('view: stringifies undefined / null', () => {
		expect(view({ value: undefined, row: {}, rowIndex: 0 })).toBe('')
		expect(view({ value: null, row: {}, rowIndex: 0 })).toBe('')
	})

	it('edit: forwards to DI Input', () => {
		const onChange = vi.fn()
		const Edit = textCellType.edit as ComponentType<FieldState>
		const { container } = renderWithComponents(<Edit {...baseField<never>({ value: 'hi', onChange })} />)
		const input = container.querySelector('input')
		if (!input) throw new Error('expected Input')
		fireEvent.change(input, { target: { value: 'bye' } })
		expect(onChange).toHaveBeenCalledWith('bye')
	})
})

describe('booleanCellType', () => {
	it('does not ship a view or filter (kit-specific)', () => {
		expect(booleanCellType.view).toBeUndefined()
		expect(booleanCellType.filter).toBeUndefined()
	})

	it('edit: forwards to DI Checkbox', () => {
		const onChange = vi.fn()
		const Edit = booleanCellType.edit as ComponentType<FieldState>
		const { container } = renderWithComponents(<Edit {...baseField<never>({ value: false, onChange })} />)
		const checkbox = container.querySelector('input[type="checkbox"]')
		if (!checkbox) throw new Error('expected Checkbox')
		fireEvent.click(checkbox)
		expect(onChange).toHaveBeenCalledWith(true)
	})
})
