import { describe, expect, it } from 'vitest'

import { FormFieldType } from './field-types'
import { FormSchemaError, parseFormSchema } from './parse'
import { isSearchable } from './search-settings'

import type { ParseOptions } from './parse'

/**
 * `searchable` at the trust boundary.
 *
 * The flag belongs to the two kinds that draw a trigger — `select` and `multiselect` — and is
 * rejected on `radiogroup` / `checkboxgroup`, which render every option inline and so have
 * nothing to search. The rejection carries the node path, like every other parse failure.
 */

const OPTIONS: ParseOptions = { optionSources: ['cities'] }

function schemaWith(node: Record<string, unknown>): Record<string, unknown> {
	return { version: 1, children: [{ type: 'section', children: [node] }] }
}

/** The path the single node above sits at — asserted, not spelled inline, in every case. */
const NODE_PATH = 'children[0].children[0]'

function parseFailure(node: Record<string, unknown>): FormSchemaError {
	try {
		parseFormSchema(schemaWith(node), OPTIONS)
	} catch (error) {
		if (error instanceof FormSchemaError) return error
		throw error
	}
	throw new Error('Expected parseFormSchema to throw a FormSchemaError')
}

describe('searchable', () => {
	it('accepts a searchable select wired to a source', () => {
		const node = {
			type: FormFieldType.Select,
			name: 'address.city',
			searchable: true,
			optionsFrom: { source: 'cities', dependsOn: { country: 'address.country' } },
		}

		expect(() => parseFormSchema(schemaWith(node), OPTIONS)).not.toThrow()
	})

	it('accepts a select that does not mention searchable at all', () => {
		const node = { type: FormFieldType.Select, name: 'city', optionsFrom: 'cities' }

		expect(() => parseFormSchema(schemaWith(node), OPTIONS)).not.toThrow()
	})

	it('rejects searchable on a radiogroup, saying why it never applies', () => {
		const error = parseFailure({
			type: FormFieldType.RadioGroup,
			name: 'plan',
			searchable: true,
			optionsFrom: 'cities',
		})

		expect(error.path).toBe(NODE_PATH)
		expect(error.message).toContain('"searchable" is only supported on "select" and "multiselect"')
		expect(error.message).toContain('radiogroup')
		expect(error.message).toContain('inline')
	})

	it('rejects searchable on a checkboxgroup', () => {
		const error = parseFailure({
			type: FormFieldType.CheckboxGroup,
			name: 'tags',
			searchable: true,
			optionsFrom: 'cities',
		})

		expect(error.path).toBe(NODE_PATH)
		expect(error.message).toContain('"searchable" is only supported on "select" and "multiselect"')
		expect(error.message).toContain('checkboxgroup')
	})

	it('accepts a searchable multiselect wired to a source', () => {
		const node = {
			type: FormFieldType.MultiSelect,
			name: 'address.cities',
			searchable: true,
			optionsFrom: { source: 'cities', dependsOn: { country: 'address.country' } },
		}

		expect(() => parseFormSchema(schemaWith(node), OPTIONS)).not.toThrow()
	})

	it('rejects a non-boolean searchable', () => {
		const error = parseFailure({ type: FormFieldType.Select, name: 'city', searchable: 'yes', optionsFrom: 'cities' })

		expect(error.path).toBe(NODE_PATH)
		expect(error.message).toContain('"searchable" must be a boolean or an object, got "yes"')
	})

	it('accepts an explicit `searchable: false` on a select', () => {
		const node = { type: FormFieldType.Select, name: 'city', searchable: false, optionsFrom: 'cities' }

		expect(() => parseFormSchema(schemaWith(node), OPTIONS)).not.toThrow()
	})

	it('accepts an explicit `searchable: false` on a multiselect', () => {
		const node = {
			type: FormFieldType.MultiSelect,
			name: 'cities',
			searchable: false,
			optionsFrom: 'cities',
		}

		expect(() => parseFormSchema(schemaWith(node), OPTIONS)).not.toThrow()
	})

	it('rejects a non-boolean searchable on a multiselect too', () => {
		const error = parseFailure({
			type: FormFieldType.MultiSelect,
			name: 'cities',
			searchable: 'yes',
			optionsFrom: 'cities',
		})

		expect(error.path).toBe(NODE_PATH)
		expect(error.message).toContain('"searchable" must be a boolean or an object, got "yes"')
	})
})

describe('searchable settings object', () => {
	const ACCEPTED: readonly unknown[] = [{ debounce: 150, minLength: 2 }, {}, true, false]

	for (const type of [FormFieldType.Select, FormFieldType.MultiSelect]) {
		for (const searchable of ACCEPTED) {
			it(`accepts searchable: ${JSON.stringify(searchable)} on a ${type}`, () => {
				const node = { type, name: 'city', searchable, optionsFrom: 'cities' }

				expect(() => parseFormSchema(schemaWith(node), OPTIONS)).not.toThrow()
			})
		}
	}

	const REJECTED: readonly (readonly [unknown, string])[] = [
		[{ debounce: -1 }, '"searchable.debounce" must be a non-negative integer, got -1'],
		[{ minLength: 1.5 }, '"searchable.minLength" must be a non-negative integer, got 1.5'],
		[{ debounce: '300' }, '"searchable.debounce" must be a non-negative integer, got "300"'],
		[{ wait: 3 }, '"searchable" has an unknown key "wait"'],
		[null, '"searchable" must be a boolean or an object, got null'],
		['yes', '"searchable" must be a boolean or an object, got "yes"'],
	]

	for (const type of [FormFieldType.Select, FormFieldType.MultiSelect]) {
		for (const [searchable, message] of REJECTED) {
			it(`rejects searchable: ${JSON.stringify(searchable)} on a ${type}`, () => {
				const error = parseFailure({ type, name: 'city', searchable, optionsFrom: 'cities' })

				expect(error.path).toBe(NODE_PATH)
				expect(error.message).toContain(message)
			})
		}
	}

	it('lets creatable ride on a settings object', () => {
		const node = {
			type: FormFieldType.Select,
			name: 'tag',
			searchable: { minLength: 1 },
			creatable: true,
			optionsFrom: 'cities',
		}

		expect(() => parseFormSchema(schemaWith(node), OPTIONS)).not.toThrow()
	})

	it('still rejects creatable beside searchable: false', () => {
		const error = parseFailure({
			type: FormFieldType.Select,
			name: 'tag',
			searchable: false,
			creatable: true,
			optionsFrom: 'cities',
		})

		expect(error.message).toContain('"creatable" requires "searchable"')
	})

	it('isSearchable reads a settings object as on and an absent or false flag as off', () => {
		expect(isSearchable(undefined)).toBe(false)
		expect(isSearchable(false)).toBe(false)
		expect(isSearchable(true)).toBe(true)
		expect(isSearchable({})).toBe(true)
	})
})
