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

test('the error names the offending node location', () => {
	try {
		parseFormSchema({ version: 1, children: [{ type: 'section', children: [{ type: 'zzz' }] }] })
		expect.unreachable()
	} catch (error) {
		expect(error).toBeInstanceOf(FormSchemaError)
		expect((error as FormSchemaError).path).toBe('children[0].children[0]')
	}
})
