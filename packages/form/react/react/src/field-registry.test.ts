import { FORM_FIELD_TYPES, RESERVED_NODE_TYPES } from '@ez-kit/form-core'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { FIELD_KEYS } from './component-guard'
import { defineFieldType, deriveFieldTypeIds, fieldTypeIdFor } from './field-registry'

import type { DeepKeysOfType } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

function Noop(): ReactNode {
	return null
}

/** A registry holding all twelve built-in slots, each pointing at the same inert component. */
function builtInRegistry(): Record<string, () => ReactNode> {
	return Object.fromEntries(Object.keys(FIELD_KEYS).map((key) => [key, Noop]))
}

describe('fieldTypeIdFor', () => {
	// Driven from the two lists rather than a hand-written table, so a thirteenth built-in
	// cannot land with a derivation nobody checked: the slot names and the document ids are
	// each declared exactly once, and this asserts they still line up.
	it('derives every built-in document id from its slot name', () => {
		const derived = Object.keys(FIELD_KEYS).map(fieldTypeIdFor).sort()

		expect(derived).toEqual([...FORM_FIELD_TYPES].sort())
	})

	it('strips the trailing Field and lowercases what is left', () => {
		expect(fieldTypeIdFor('RatingField')).toBe('rating')
		expect(fieldTypeIdFor('ColourPickerField')).toBe('colourpicker')
	})

	it('accepts a key that does not end in Field', () => {
		expect(fieldTypeIdFor('Rating')).toBe('rating')
	})

	it('throws when the derived id would be empty', () => {
		expect(() => fieldTypeIdFor('Field')).toThrow(/Field/)
	})
})

describe('deriveFieldTypeIds', () => {
	it('maps every derived id back to the key it came from', () => {
		const ids = deriveFieldTypeIds({ ...builtInRegistry(), RatingField: Noop })

		expect(ids.rating).toBe('RatingField')
		expect(ids.radiogroup).toBe('RadioGroupField')
	})

	it('does not throw when a built-in key derives its own built-in id', () => {
		// Replacing a kit's field at its own key is the point of an open registry, so the
		// twelve deriving `text`, `number`, … must not read as a collision.
		expect(() => deriveFieldTypeIds(builtInRegistry())).not.toThrow()
	})

	it('throws when two keys derive the same id', () => {
		expect(() => deriveFieldTypeIds({ RatingField: Noop, Rating: Noop })).toThrow(/rating/)
	})

	it('throws when a derived id collides with a reserved node type', () => {
		// Without this, `SectionField` would silently shadow the `section` container node.
		expect(() => deriveFieldTypeIds({ SectionField: Noop })).toThrow(/section/)
	})

	it('names every reserved node type as a collision', () => {
		for (const reserved of RESERVED_NODE_TYPES) {
			const key = `${reserved.charAt(0).toUpperCase()}${reserved.slice(1)}Field`
			expect(() => deriveFieldTypeIds({ [key]: Noop })).toThrow(new RegExp(reserved))
		}
	})
})

describe('defineFieldType', () => {
	it('returns the definition it was given, by identity', () => {
		// The `__props` / `__value` markers are type-only — nothing may reach the bundle, and
		// nothing may change the component's identity, or React would remount on every build.
		const definition = defineFieldType<{ max: number }, number>()(Noop)

		expect(definition).toBe(Noop)
	})
})

describe('DeepKeysOfType with the default value parameter', () => {
	type Data = { score: number; email: string; nested: { flag: boolean }; items: { score: number }[] }

	// Measured, not assumed — §3.3 of the plan flagged this as unverified. `unknown` yields
	// **every** path in the form data (leaves, containers and array members alike) and still
	// rejects a path that does not exist, so a field declared without a value type narrows
	// `name` to the form's real paths rather than collapsing to `never`.
	it('yields every path in the form data', () => {
		expectTypeOf<DeepKeysOfType<Data, unknown>>().toEqualTypeOf<
			'score' | 'email' | 'nested' | 'items' | 'nested.flag' | `items[${number}]` | `items[${number}].score`
		>()
	})
})
