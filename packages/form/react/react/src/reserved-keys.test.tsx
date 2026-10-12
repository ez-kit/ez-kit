import { describe, expect, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields } from './test-kit'

import type { FormComponentRegistry } from './contract'
import type { FormFieldRegistry } from './field-registry'
import type { ReservedKeyGuard, SharedKeyGuard } from './reserved-keys'

const Noop = () => null

describe('reserved keys', () => {
	it.each([
		'Subscribe',
		'state',
		'reset',
		'handleSubmit',
		'Field',
		'FormGroup',
		'AppField',
		'Submit',
		'Array',
		'NativeField',
		'Steps',
		'Step',
	])('rejects %s in fields at runtime', (key) => {
		expect(() => createForm({ fields: { [key]: Noop } as never })).toThrow(
			`createForm: "${key}" is reserved by the form instance and cannot be registered in fields.`,
		)
	})

	it('rejects a reserved key in components at runtime', () => {
		expect(() => createForm({ components: { state: Noop } as never })).toThrow(
			'createForm: "state" is reserved by the form instance and cannot be registered in components.',
		)
	})

	it('rejects a key registered in both fields and components', () => {
		expect(() =>
			createForm({ fields: { RatingField: Noop } as never, components: { RatingField: Noop } as never }),
		).toThrow('createForm: "RatingField" is registered in both fields and components.')
	})

	it('accepts a key named after an Object.prototype member, which the instance does not own', () => {
		expect(() => createForm({ components: { toString: Noop } as never })).not.toThrow()
	})

	it('rejects them in the types', () => {
		// Never called: each of these throws at runtime too, and only the compiler is asked here.
		const typeOnly = () => {
			// @ts-expect-error — reserved
			createForm({ fields: { Subscribe: Noop } })
			// @ts-expect-error — reserved
			createForm({ components: { handleSubmit: Noop } })
			// @ts-expect-error — registered in both
			createForm({ fields: { RatingField: Noop }, components: { RatingField: Noop } })
		}
		expectTypeOf(typeOnly).toBeFunction()
		expect(() => createForm({ fields: testFields, components: testComponents })).not.toThrow()
	})

	it('accepts literal components beside a fields registry typed by its bound', () => {
		const wideFields: FormFieldRegistry = { RatingField: Noop }
		const wideComponents: FormComponentRegistry = { SaveBar: Noop }
		expect(() => createForm({ fields: wideFields, components: { SaveBar: Noop } })).not.toThrow()
		expect(() => createForm({ fields: { RatingField: Noop }, components: wideComponents })).not.toThrow()
	})

	/**
	 * The `@ts-expect-error` cases above only say *some* error fires. These pin that it is the
	 * guard's — a reserved or shared key maps to its message, and nothing else maps at all.
	 */
	it('maps exactly the offending keys to their message', () => {
		expectTypeOf<ReservedKeyGuard<{ Subscribe: unknown; RatingField: unknown }>>().toEqualTypeOf<{
			Subscribe: 'Error: "Subscribe" is reserved by the form instance'
		}>()
		expectTypeOf<ReservedKeyGuard<{ Submit?: unknown }>>().toEqualTypeOf<{
			Submit?: 'Error: "Submit" is reserved by the form instance'
		}>()
		expectTypeOf<SharedKeyGuard<{ RatingField: unknown; SaveBar: unknown }, { RatingField: unknown }>>().toEqualTypeOf<{
			RatingField: 'Error: "RatingField" is registered in both fields and components'
		}>()
		// A registry typed by its bound (`Record<string, …>`) names no key, so it shares none.
		expectTypeOf<SharedKeyGuard<Record<string, unknown>, Record<string, unknown>>>().toEqualTypeOf<
			Record<never, never>
		>()
		expectTypeOf<SharedKeyGuard<Record<string, unknown>, { RatingField: unknown }>>().toEqualTypeOf<
			Record<never, never>
		>()
		expectTypeOf<SharedKeyGuard<{ SaveBar: unknown }, Record<string, unknown>>>().toEqualTypeOf<Record<never, never>>()
	})
})
