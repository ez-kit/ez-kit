import { expectTypeOf, test } from 'vitest'

import { FormFieldType } from './field-types'
import { defineFormSchema } from './schema'
import { TextInputType } from './text-input-type'

type Values = { email: string; age: number }

/**
 * Type-level guarantees of `defineFormSchema`. Nothing here runs — a violation fails
 * `typecheck`, which is the point (the shared vitest config does not run `--typecheck`,
 * so a `.test-d.ts` file would silently never execute).
 */
test('a field name must match the field kind', () => {
	const define = defineFormSchema<Values>()

	define({ version: 1, children: [{ type: FormFieldType.Text, name: 'email' }] })

	// @ts-expect-error `age` is a number, not a string
	define({ version: 1, children: [{ type: FormFieldType.Text, name: 'age' }] })

	// @ts-expect-error `nope` is not a path in Values
	define({ version: 1, children: [{ type: FormFieldType.Text, name: 'nope' }] })

	expectTypeOf(define).toBeFunction()
})

test('inputType is a closed set, not a bare string', () => {
	const define = defineFormSchema<Values>()

	define({
		version: 1,
		children: [{ type: FormFieldType.Text, name: 'email', inputType: TextInputType.Email }],
	})

	// @ts-expect-error `inputType` is a TextInputType, not an arbitrary string
	define({ version: 1, children: [{ type: FormFieldType.Text, name: 'email', inputType: 'nope' }] })

	expectTypeOf(define).toBeFunction()
})

test('a registered custom type is accepted; an unregistered one is not', () => {
	const define = defineFormSchema<Values, 'rating'>()

	// A custom field's value type is unknown, so `name` narrows only to a path in Values.
	define({ version: 1, children: [{ type: 'rating', name: 'age' }] })

	// @ts-expect-error `zzz` was never registered via defineFormSchema<Values, 'rating'>()
	define({ version: 1, children: [{ type: 'zzz', name: 'age' }] })

	expectTypeOf(define).toBeFunction()
})
