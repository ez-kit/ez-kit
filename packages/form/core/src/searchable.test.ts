import { describe, expect, it } from 'vitest'

import { FormFieldType } from './field-types'
import { FormSchemaError, parseFormSchema } from './parse'

import type { ParseOptions } from './parse'

/**
 * `searchable` at the trust boundary.
 *
 * The flag is `select`-only, and the two ways of getting that wrong deserve different words:
 * a `radiogroup` / `checkboxgroup` renders every option inline and never will be searchable,
 * while `multiselect` + search is a coherent feature that is simply not built yet. A document
 * author reading "not supported yet" waits for a release; one reading "cannot" rewrites the
 * form. Both messages carry the node path, like every other parse failure.
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
		expect(error.message).toContain('"searchable" is only supported on "select"')
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
		expect(error.message).toContain('"searchable" is only supported on "select"')
		expect(error.message).toContain('checkboxgroup')
	})

	it('rejects searchable on a multiselect as not supported *yet*, not as illegal', () => {
		const error = parseFailure({
			type: FormFieldType.MultiSelect,
			name: 'cities',
			searchable: true,
			optionsFrom: 'cities',
		})

		expect(error.path).toBe(NODE_PATH)
		expect(error.message).toContain('not supported')
		expect(error.message).toContain('yet')
		// Deliberately not the "only supported on select" wording: the feature is missing, not
		// meaningless, and the message is what tells an author which of the two it is.
		expect(error.message).not.toContain('only supported on "select"')
	})

	it('rejects a non-boolean searchable', () => {
		const error = parseFailure({ type: FormFieldType.Select, name: 'city', searchable: 'yes', optionsFrom: 'cities' })

		expect(error.path).toBe(NODE_PATH)
		expect(error.message).toContain('"searchable" must be a boolean')
	})

	it('accepts an explicit `searchable: false` on a select', () => {
		const node = { type: FormFieldType.Select, name: 'city', searchable: false, optionsFrom: 'cities' }

		expect(() => parseFormSchema(schemaWith(node), OPTIONS)).not.toThrow()
	})

	it('still rejects `searchable: false` on a multiselect — the key itself is what is unsupported', () => {
		const error = parseFailure({
			type: FormFieldType.MultiSelect,
			name: 'cities',
			searchable: false,
			optionsFrom: 'cities',
		})

		expect(error.message).toContain('not supported')
	})
})
