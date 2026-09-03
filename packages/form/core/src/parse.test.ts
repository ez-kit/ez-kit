import { expect, test } from 'vitest'

import { FormSchemaError, parseFormSchema } from './parse'

const base = { version: 1, children: [] }

test('accepts a minimal document', () => {
	expect(parseFormSchema(base)).toEqual(base)
})

test('rejects an unknown version', () => {
	expect(() => parseFormSchema({ version: 2, children: [] })).toThrow(/version/i)
})

test('rejects a node type that is neither built in nor registered', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'rating', name: 'a' }] })).toThrow(
		/unknown node type "rating"/i,
	)
})

test('accepts a registered custom field type', () => {
	const schema = { version: 1, children: [{ type: 'rating', name: 'a' }] }
	expect(parseFormSchema(schema, { fieldTypes: ['rating'] })).toEqual(schema)
})

test('rejects a duplicate field name', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{ type: 'text', name: 'a' },
				{ type: 'section', children: [{ type: 'text', name: 'a' }] },
			],
		}),
	).toThrow(/duplicate field name "a"/i)
})

test('rejects a rule key with no registered implementation', () => {
	expect(() =>
		parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', validate: { rule: 'inn' } }] }),
	).toThrow(/unknown validation rule "inn"/i)
})

test('rejects a relative field reference in v1', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [{ type: 'text', name: 'a', when: { field: './b', eq: 1 } }],
		}),
	).toThrow(/relative/i)
})

test('rejects a translation key when no translate is available', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', label: { key: 'x' } }] })).toThrow(
		/translate/i,
	)
})

test('rejects a function condition in an external document', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', when: () => true }] })).toThrow(
		/function/i,
	)
})

test('rejects step nodes mixed with non-step siblings', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{ type: 'step', children: [] },
				{ type: 'text', name: 'a' },
			],
		}),
	).toThrow(/step/i)
})

test('rejects a registry key that collides with a reserved node type', () => {
	expect(() => parseFormSchema({ version: 1, children: [] }, { fieldTypes: ['section'] })).toThrow(/reserved/i)
})

test('rejects a block naming a component that is not registered', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'block', component: 'promo-banner' }] })).toThrow(
		/promo-banner/,
	)
})

test('accepts a block naming a registered component', () => {
	const schema = { version: 1, children: [{ type: 'block', component: 'promo-banner' }] }
	expect(parseFormSchema(schema, { blocks: ['promo-banner'] })).toEqual(schema)
})

test('rejects a null condition instead of crashing on the "in" operator check', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', when: null }] })).toThrow(
		FormSchemaError,
	)
})

test('rejects a primitive condition', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', when: 'bogus' }] })).toThrow(
		FormSchemaError,
	)
})

test('rejects an empty condition object', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', when: {} }] })).toThrow(
		FormSchemaError,
	)
})

test('rejects a condition object with no recognised operator key', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', when: { foo: 1 } }] })).toThrow(
		FormSchemaError,
	)
})

test('rejects a composite condition whose "and" is not an array', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', when: { and: 'nope' } }] })).toThrow(
		FormSchemaError,
	)
})

test('rejects a localized text value that is neither a string nor an object', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', label: 42 }] })).toThrow(
		FormSchemaError,
	)
})

test('rejects a localized text object with no string "key"', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', label: {} }] })).toThrow(
		FormSchemaError,
	)
})

test('rejects a section "columns" outside the supported 1..4 range', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'section', columns: 6, children: [] }] })).toThrow(
		FormSchemaError,
	)
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'section', columns: 6, children: [] }] })).toThrow(
		/columns/i,
	)
})

test('rejects a non-integer "colSpan"', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', colSpan: 1.5 }] })).toThrow(
		FormSchemaError,
	)
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', colSpan: 1.5 }] })).toThrow(
		/colSpan/i,
	)
})

test('the error names the offending node location', () => {
	try {
		parseFormSchema({ version: 1, children: [{ type: 'section', children: [{ type: 'zzz' }] }] })
		expect.unreachable()
	} catch (error) {
		expect(error).toBeInstanceOf(FormSchemaError)
		expect((error as FormSchemaError).path).toBe('children[0].children[0]')
	}
})

test('accepts a select whose option labels are translation keys when a translator is registered', () => {
	const document = {
		version: 1,
		children: [
			{
				type: 'select',
				name: 'country',
				options: [{ value: 'RU', label: { key: 'country.ru' } }],
			},
		],
	}

	expect(() => parseFormSchema(document, { hasTranslate: true })).not.toThrow()
	expect(() => parseFormSchema(document)).toThrow(/country\.ru/)
})

test('rejects an option label that is neither a string nor a translation key', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [{ type: 'radiogroup', name: 'plan', options: [{ value: 'free', label: 42 }] }],
		}),
	).toThrow(FormSchemaError)
})

test('rejects a select with no options, and an option with no value or label', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'select', name: 'country' }] })).toThrow(/options/i)
	expect(() =>
		parseFormSchema({ version: 1, children: [{ type: 'select', name: 'country', options: [{ label: 'RU' }] }] }),
	).toThrow(/value/i)
	expect(() =>
		parseFormSchema({ version: 1, children: [{ type: 'select', name: 'country', options: [{ value: 'RU' }] }] }),
	).toThrow(/label/i)
})

test('rejects a date whose bounds or defaultValue are not YYYY-MM-DD', () => {
	expect(() =>
		parseFormSchema({ version: 1, children: [{ type: 'date', name: 'startsOn', min: '31/08/2026' }] }),
	).toThrow(/YYYY-MM-DD/)
	expect(() =>
		parseFormSchema({ version: 1, children: [{ type: 'date', name: 'startsOn', defaultValue: '2026-02-31' }] }),
	).toThrow(FormSchemaError)
	expect(() =>
		parseFormSchema({ version: 1, children: [{ type: 'date', name: 'startsOn', defaultValue: '2026-08-31' }] }),
	).not.toThrow()
})

test('a date range defaultValue must carry both ends', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [{ type: 'daterange', name: 'stay', defaultValue: { start: '2026-08-01' } }],
		}),
	).toThrow(/start, end/)
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [{ type: 'daterange', name: 'stay', defaultValue: { start: '2026-08-01', end: '2026-08-05' } }],
		}),
	).not.toThrow()
})

test('a multi-value defaultValue must be an array of option values', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [{ type: 'multiselect', name: 'tags', options: [{ value: 'a', label: 'A' }], defaultValue: 'a' }],
		}),
	).toThrow(/array of option values/)
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [{ type: 'checkboxgroup', name: 'tags', options: [{ value: 'a', label: 'A' }], defaultValue: ['a'] }],
		}),
	).not.toThrow()
})

test('a multiselect needs options, exactly as a select does', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'multiselect', name: 'tags' }] })).toThrow(/options/i)
})

test('accepts numeric option values, and a numeric multi-value defaultValue', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{ type: 'select', name: 'countryId', options: [{ value: 49, label: 'Germany' }] },
				{
					type: 'multiselect',
					name: 'tagIds',
					options: [
						{ value: 1, label: 'Design' },
						{ value: 2, label: 'Engineering' },
					],
					defaultValue: [1, 2],
				},
				{ type: 'checkboxgroup', name: 'roleIds', options: [{ value: 7, label: 'Admin' }], defaultValue: [] },
			],
		}),
	).not.toThrow()
})

test('rejects an options list that mixes string and number values', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{
					type: 'select',
					name: 'countryId',
					options: [
						{ value: 1, label: 'Germany' },
						{ value: '1', label: 'Germany, again' },
					],
				},
			],
		}),
	).toThrow(/cannot mix/i)
})

test('rejects an option value that is neither a string nor a number', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [{ type: 'select', name: 'active', options: [{ value: true, label: 'Yes' }] }],
		}),
	).toThrow(/string or a number/i)
})

test('rejects a multi-value defaultValue whose entries disagree with the option value type', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{ type: 'multiselect', name: 'tagIds', options: [{ value: 1, label: 'Design' }], defaultValue: ['1'] },
			],
		}),
	).toThrow(/must all be number option values/i)

	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{ type: 'checkboxgroup', name: 'tagIds', options: [{ value: 1, label: 'Design' }], defaultValue: [1, '2'] },
			],
		}),
	).toThrow(/must all be number option values/i)
})
