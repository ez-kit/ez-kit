import { describe, expect, it, test } from 'vitest'

import { FormSchemaError, parseFormSchema } from './parse'

import type { ParseOptions } from './parse'

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
		parseFormSchema(
			{
				version: 1,
				children: [
					{ type: 'text', name: 'a' },
					{ type: 'block', component: 'Section', children: [{ type: 'text', name: 'a' }] },
				],
			},
			{ components: ['Section'] },
		),
	).toThrow(/duplicate field name "a"/i)
})

test('rejects a rule key with no registered implementation', () => {
	expect(() =>
		parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', validate: { rule: 'inn' } }] }),
	).toThrow(/unknown validation rule "inn"/i)
})

test('rejects a relative field reference outside an array item', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [{ type: 'text', name: 'a', when: { field: './b', eq: 1 } }],
		}),
	).toThrow(/relative/i)
})

test('accepts a relative field reference inside an array item', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{
					type: 'array',
					name: 'people',
					children: [
						{ type: 'text', name: 'kind' },
						{ type: 'text', name: 'company', when: { field: './kind', eq: 'company' } },
					],
				},
			],
		}),
	).not.toThrow()
})

test('accepts a relative reference inside a nested array, where the nearest item is the scope', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{
					type: 'array',
					name: 'people',
					children: [
						{
							type: 'array',
							name: 'addresses',
							children: [
								{ type: 'text', name: 'kind' },
								{ type: 'text', name: 'city', when: { field: './kind', eq: 'home' } },
							],
						},
					],
				},
			],
		}),
	).not.toThrow()
})

test("an array's own condition is read in its parent's scope, not in its items'", () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{ type: 'array', name: 'people', children: [{ type: 'text', name: 'a' }], when: { field: './b', eq: 1 } },
			],
		}),
	).toThrow(/relative/i)
})

test('rejects a translation key when no translate is available', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', label: { i18n: 'x' } }] })).toThrow(
		/translate/i,
	)
})

test('rejects the old key spelling of a translation key', () => {
	expect(() =>
		parseFormSchema(
			{ version: 1, children: [{ type: 'text', name: 'a', label: { key: 'x' } }] },
			{ hasTranslate: true },
		),
	).toThrow(/"i18n"/)
})

test('rejects a function condition in an external document', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', when: () => true }] })).toThrow(
		/function/i,
	)
})

test.each(['section', 'submit'])('keeps %s reserved for field kinds', (type) => {
	expect(() => parseFormSchema({ version: 1, children: [] }, { fieldTypes: [type] })).toThrow(/reserved/i)
})

test('rejects a block naming a component that is not registered', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'block', component: 'promo-banner' }] })).toThrow(
		/promo-banner/,
	)
})

test('accepts a block naming a registered component', () => {
	const schema = { version: 1, children: [{ type: 'block', component: 'promo-banner' }] }
	expect(parseFormSchema(schema, { components: ['promo-banner'] })).toEqual(schema)
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

test('rejects "columns" outside the supported 1..4 range', () => {
	const schema = { version: 1, children: [{ type: 'block', component: 'Section', columns: 6, children: [] }] }
	expect(() => parseFormSchema(schema, { components: ['Section'] })).toThrow(FormSchemaError)
	expect(() => parseFormSchema(schema, { components: ['Section'] })).toThrow(/columns/i)
})

test('rejects a non-integer "colSpan"', () => {
	const schema = { version: 1, columns: 2, children: [{ type: 'text', name: 'a', colSpan: 1.5 }] }
	expect(() => parseFormSchema(schema)).toThrow(FormSchemaError)
	expect(() => parseFormSchema(schema)).toThrow(/colSpan/i)
})

test('the error names the offending node location', () => {
	try {
		parseFormSchema(
			{ version: 1, children: [{ type: 'block', component: 'Section', children: [{ type: 'zzz' }] }] },
			{ components: ['Section'] },
		)
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
				options: [{ value: 'RU', label: { i18n: 'country.ru' } }],
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

describe('layout', () => {
	const COMPONENTS: ParseOptions = { components: ['Section', 'SubmitButton', 'Card', 'Grid'] }

	function failure(schema: Record<string, unknown>, options: ParseOptions = COMPONENTS): FormSchemaError {
		try {
			parseFormSchema(schema, options)
		} catch (error) {
			if (error instanceof FormSchemaError) return error
			throw error
		}
		throw new Error('Expected parseFormSchema to throw a FormSchemaError')
	}

	it('accepts a block container with columns, spans inside it, and a leaf block', () => {
		const schema = {
			version: 1,
			columns: 2,
			children: [
				{
					type: 'block',
					component: 'Section',
					props: { title: 'Contact' },
					columns: 2,
					colSpan: 2,
					children: [{ type: 'text', name: 'email', colSpan: 2 }],
				},
				{ type: 'block', component: 'SubmitButton', props: { children: 'Send' } },
			],
		}
		expect(parseFormSchema(schema, COMPONENTS)).toEqual(schema)
	})

	it('accepts columns on an array, with spans inside its entries', () => {
		const schema = {
			version: 1,
			children: [
				{ type: 'array', name: 'people', columns: 2, children: [{ type: 'text', name: 'first', colSpan: 2 }] },
			],
		}
		expect(parseFormSchema(schema, COMPONENTS)).toEqual(schema)
	})

	it.each([
		['section', "{ type: 'block', component: 'Section'"],
		['submit', "{ type: 'block', component: 'SubmitButton'"],
	])('rejects a %s node, naming what replaces it', (type, replacement) => {
		const error = failure({ version: 1, children: [{ type, children: [] }] })
		expect(error.message).toContain(replacement)
		expect(error.path).toBe('children[0]')
	})

	it('rejects a component that is not registered, naming it', () => {
		const error = failure({ version: 1, children: [{ type: 'block', component: 'Tabs' }] })
		expect(error.message).toContain('"Tabs"')
	})

	it('rejects Grid as a block, pointing at columns', () => {
		const error = failure({ version: 1, children: [{ type: 'block', component: 'Grid', children: [] }] })
		expect(error.message).toMatch(/columns/)
	})

	it.each(['label', 'description', 'disabledWhen'])('rejects %s on a block, pointing at props', (key) => {
		const value = key === 'disabledWhen' ? { field: 'a', eq: 1 } : 'Contact'
		const error = failure({ version: 1, children: [{ type: 'block', component: 'Card', [key]: value }] })
		expect(error.message).toContain(key)
		expect(error.message).toMatch(/props/)
	})

	it('rejects props.children beside node children', () => {
		const error = failure({
			version: 1,
			children: [{ type: 'block', component: 'Card', props: { children: 'x' }, children: [] }],
		})
		expect(error.message).toMatch(/children/)
		expect(error.path).toBe('children[0]')
	})

	it('rejects columns on a field', () => {
		const error = failure({ version: 1, children: [{ type: 'text', name: 'a', columns: 2 }] })
		expect(error.message).toMatch(/columns/)
		expect(error.path).toBe('children[0]')
	})

	it('rejects columns on a block without children', () => {
		const error = failure({ version: 1, children: [{ type: 'block', component: 'Card', columns: 2 }] })
		expect(error.message).toMatch(/columns/)
	})

	it('rejects colSpan when the nearest container sets no columns', () => {
		const error = failure({
			version: 1,
			columns: 2,
			children: [{ type: 'block', component: 'Card', children: [{ type: 'text', name: 'a', colSpan: 2 }] }],
		})
		expect(error.message).toMatch(/colSpan/)
		expect(error.path).toBe('children[0].children[0]')
	})

	it('rejects colSpan at the root of a document without columns', () => {
		const error = failure({ version: 1, children: [{ type: 'text', name: 'a', colSpan: 2 }] })
		expect(error.path).toBe('children[0]')
	})

	it('rejects colSpan inside an array entry when the array sets no columns', () => {
		const error = failure({
			version: 1,
			columns: 2,
			children: [{ type: 'array', name: 'people', children: [{ type: 'text', name: 'first', colSpan: 2 }] }],
		})
		expect(error.path).toBe('children[0].children[0]')
	})

	it('rejects a colSpan wider than its container', () => {
		const error = failure({ version: 1, columns: 2, children: [{ type: 'text', name: 'a', colSpan: 3 }] })
		expect(error.message).toMatch(/colSpan/)
		expect(error.path).toBe('children[0]')
	})

	it('rejects block props JSON cannot carry', () => {
		const schema = { version: 1, children: [{ type: 'block', component: 'Card', props: { onClick: () => undefined } }] }
		expect(failure(schema).message).toMatch(/props/)
	})

	it.each(['constructor', 'toString', '__proto__'])(
		'reports an unknown type %s as unknown, not as a removed node',
		(type) => {
			expect(failure({ version: 1, children: [{ type, name: 'a' }] }).message).toContain(`Unknown node type "${type}"`)
		},
	)

	it('rejects root columns outside 1..4', () => {
		expect(failure({ version: 1, columns: 5, children: [] }).message).toMatch(/columns/)
	})

	it('checks an { i18n } value in props as a translation key', () => {
		const schema = { version: 1, children: [{ type: 'block', component: 'Card', props: { title: { i18n: 'card' } } }] }
		expect(failure(schema).message).toMatch(/translate/)
		expect(parseFormSchema(schema, { ...COMPONENTS, hasTranslate: true })).toEqual(schema)
	})

	it('rejects a malformed { i18n } value in props', () => {
		const schema = { version: 1, children: [{ type: 'block', component: 'Card', props: { title: { i18n: 3 } } }] }
		expect(failure(schema, { ...COMPONENTS, hasTranslate: true }).message).toMatch(/i18n/)
	})
})
