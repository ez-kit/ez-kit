import { describe, expect, it } from 'vitest'

import { FormFieldType } from './field-types'
import { FormSchemaError, parseFormSchema } from './parse'

import type { ParseOptions } from './parse'

/**
 * `optionsFrom` at the trust boundary.
 *
 * The parser can only ever confirm that *this app* registered the name a document asks for —
 * that is the whole point of naming a source instead of carrying a URL. So these tests are
 * about exactly two things: that an unregistered name is refused with the node's path, and
 * that everything travelling beside the name (`dependsOn` refs, `params`) is held to the same
 * serialisability and absolute-path rules the rest of the format already is.
 */

const OPTIONS: ParseOptions = { optionSources: ['dictionary', 'cities'] }

/** One select node, wrapped in the smallest document that reaches `validateNode`. */
function schemaWith(node: Record<string, unknown>): Record<string, unknown> {
	return { version: 1, children: [{ type: 'section', children: [node] }] }
}

function selectNode(extra: Record<string, unknown>): Record<string, unknown> {
	return { type: FormFieldType.Select, name: 'address.city', ...extra }
}

/** The path the single node above sits at — asserted, not spelled inline, in every case. */
const NODE_PATH = 'children[0].children[0]'

function parseFailure(node: Record<string, unknown>, options: ParseOptions = OPTIONS): FormSchemaError {
	try {
		parseFormSchema(schemaWith(node), options)
	} catch (error) {
		if (error instanceof FormSchemaError) return error
		throw error
	}
	throw new Error('Expected parseFormSchema to throw a FormSchemaError')
}

describe('optionsFrom', () => {
	it('accepts a bare source name as sugar for { source }', () => {
		expect(() => parseFormSchema(schemaWith(selectNode({ optionsFrom: 'cities' })), OPTIONS)).not.toThrow()
	})

	it('accepts the full object form with params and dependsOn', () => {
		const node = selectNode({
			optionsFrom: {
				source: 'dictionary',
				params: { domain: 'cities', limit: 50, nested: { deep: [1, 'two', true, null] } },
				dependsOn: { country: 'address.country' },
			},
		})

		expect(() => parseFormSchema(schemaWith(node), OPTIONS)).not.toThrow()
	})

	it('rejects a source the app never registered, naming it and the node path', () => {
		const error = parseFailure(selectNode({ optionsFrom: 'citiez' }))

		expect(error.message).toContain('Unknown option source "citiez"')
		expect(error.path).toBe(NODE_PATH)
	})

	it('rejects a source name when no sources are registered at all', () => {
		const error = parseFailure(selectNode({ optionsFrom: 'cities' }), {})

		expect(error.message).toContain('Unknown option source "cities"')
	})

	it('rejects a node carrying both options and optionsFrom', () => {
		const node = selectNode({
			options: [{ label: 'Moscow', value: 'msk' }],
			optionsFrom: 'cities',
		})

		const error = parseFailure(node)

		expect(error.message).toContain('cannot carry both "options" and "optionsFrom"')
		expect(error.path).toBe(NODE_PATH)
	})

	it('rejects a node carrying neither', () => {
		const error = parseFailure(selectNode({}))

		expect(error.message).toContain('needs either an "options" array or an "optionsFrom" source')
		expect(error.path).toBe(NODE_PATH)
	})

	it('rejects an object form with no source name', () => {
		const error = parseFailure(selectNode({ optionsFrom: { params: { domain: 'cities' } } }))

		expect(error.message).toContain('"optionsFrom" is missing a "source" name')
	})

	it('rejects an optionsFrom that is neither a string nor an object', () => {
		const error = parseFailure(selectNode({ optionsFrom: 42 }))

		expect(error.message).toContain('must be a source name or an object with a "source" name')
	})

	it('applies to every select-like kind, not only select', () => {
		for (const type of [FormFieldType.RadioGroup, FormFieldType.MultiSelect, FormFieldType.CheckboxGroup]) {
			const error = parseFailure({ type, name: 'tags', optionsFrom: 'nope' })

			expect(error.message).toContain('Unknown option source "nope"')
		}
	})

	describe('dependsOn', () => {
		it('rejects a relative field reference, exactly as a condition does', () => {
			const node = selectNode({
				optionsFrom: { source: 'cities', dependsOn: { country: './country' } },
			})

			const error = parseFailure(node)

			expect(error.message).toContain('Relative field reference "./country" is reserved for array items')
			expect(error.path).toBe(NODE_PATH)
		})

		it('rejects a non-string reference', () => {
			const node = selectNode({ optionsFrom: { source: 'cities', dependsOn: { country: 7 } } })

			const error = parseFailure(node)

			expect(error.message).toContain('"dependsOn.country" must be a field path string')
		})

		it('rejects a dependsOn that is not an object', () => {
			const node = selectNode({ optionsFrom: { source: 'cities', dependsOn: ['address.country'] } })

			const error = parseFailure(node)

			expect(error.message).toContain('"dependsOn" must map a parameter name to a field path')
		})
	})

	describe('params', () => {
		it.each([
			['a function', () => 'x'],
			['undefined', undefined],
			['NaN', Number.NaN],
			['Infinity', Number.POSITIVE_INFINITY],
			['a Date', new Date('2026-01-01')],
		])('rejects %s', (_label, value) => {
			const node = selectNode({ optionsFrom: { source: 'dictionary', params: { domain: value } } })

			const error = parseFailure(node)

			expect(error.message).toContain('"params.domain"')
			expect(error.path).toBe(NODE_PATH)
		})

		it('rejects a non-serialisable value nested inside an array', () => {
			const node = selectNode({
				optionsFrom: { source: 'dictionary', params: { domains: ['cities', new Date('2026-01-01')] } },
			})

			const error = parseFailure(node)

			expect(error.message).toContain('"params.domains[1]"')
		})

		it('rejects params that are not an object', () => {
			const node = selectNode({ optionsFrom: { source: 'dictionary', params: ['cities'] } })

			const error = parseFailure(node)

			expect(error.message).toContain('"params" must be an object of JSON values')
		})
	})
})
