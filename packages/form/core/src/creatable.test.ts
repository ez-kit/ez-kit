import { describe, expect, it } from 'vitest'

import { FormFieldType } from './field-types'
import { FormSchemaError, parseFormSchema } from './parse'

/**
 * `creatable` at the trust boundary.
 *
 * The two restrictions a document can break are the schema's own, not a kit's. It rides on
 * `searchable`, because a value is created by typing it and only a searchable field has an
 * input. And it is string-only, because typed text is a string — the same rule
 * `CreatableProvision` enforces in TypeScript, restated here for a document that never went
 * through it. A numeric `optionsFrom` source is invisible from here and stays the author's
 * error; that is the one gap, and it is deliberate.
 */

const NODE_PATH = 'children[0].children[0]'

function schemaWith(node: Record<string, unknown>): Record<string, unknown> {
	return { version: 1, children: [{ type: 'section', children: [node] }] }
}

function parseFailure(node: Record<string, unknown>): FormSchemaError {
	try {
		parseFormSchema(schemaWith(node), { optionSources: ['tags'] })
	} catch (error) {
		if (error instanceof FormSchemaError) return error
		throw error
	}
	throw new Error('Expected parseFormSchema to throw a FormSchemaError')
}

const TAGS = [
	{ label: 'Bug', value: 'bug' },
	{ label: 'Chore', value: 'chore' },
]

describe('creatable', () => {
	it('accepts a creatable searchable select over a string list', () => {
		const node = { type: FormFieldType.Select, name: 'tag', searchable: true, creatable: true, options: TAGS }

		expect(() => parseFormSchema(schemaWith(node), { optionSources: ['tags'] })).not.toThrow()
	})

	it('accepts a creatable searchable multiselect wired to a source', () => {
		const node = {
			type: FormFieldType.MultiSelect,
			name: 'tags',
			searchable: true,
			creatable: true,
			createLabel: { key: 'tags.create' },
			optionsFrom: 'tags',
		}

		expect(() => parseFormSchema(schemaWith(node), { optionSources: ['tags'] })).not.toThrow()
	})

	it('rejects creatable without searchable, saying where the text would be typed', () => {
		const error = parseFailure({ type: FormFieldType.Select, name: 'tag', creatable: true, options: TAGS })

		expect(error.path).toBe(NODE_PATH)
		expect(error.message).toContain('"creatable" requires "searchable": true')
		expect(error.message).toContain('somewhere to type')
	})

	it('rejects creatable on a numeric option list', () => {
		const error = parseFailure({
			type: FormFieldType.Select,
			name: 'tag',
			searchable: true,
			creatable: true,
			options: [
				{ label: 'Bug', value: 1 },
				{ label: 'Chore', value: 2 },
			],
		})

		expect(error.message).toContain('numeric option list')
		expect(error.message).toContain('onCreate')
	})

	it('rejects creatable on a checkboxgroup, saying why it never applies', () => {
		const error = parseFailure({
			type: FormFieldType.CheckboxGroup,
			name: 'tags',
			creatable: true,
			options: TAGS,
		})

		expect(error.message).toContain('"creatable" is only supported on "select" and "multiselect"')
		expect(error.message).toContain('checkboxgroup')
	})

	it('rejects a non-boolean creatable', () => {
		const error = parseFailure({
			type: FormFieldType.Select,
			name: 'tag',
			searchable: true,
			creatable: 'yes',
			options: TAGS,
		})

		expect(error.message).toContain('"creatable" must be a boolean')
	})

	it('rejects createLabel without creatable, rather than ignoring it', () => {
		const error = parseFailure({
			type: FormFieldType.Select,
			name: 'tag',
			searchable: true,
			createLabel: 'Add a tag',
			options: TAGS,
		})

		expect(error.message).toContain('"createLabel" is only meaningful together with "creatable": true')
	})

	it('accepts a select that does not mention creatable at all', () => {
		const node = { type: FormFieldType.Select, name: 'tag', options: TAGS }

		expect(() => parseFormSchema(schemaWith(node), { optionSources: ['tags'] })).not.toThrow()
	})
})
