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

test('a select-like field correlates its option values with its name', () => {
	type Entities = { country: string; countryId: number; tagIds: number[]; tags: string[] }
	const define = defineFormSchema<Entities>()

	// A numeric path takes numeric options…
	define({
		version: 1,
		children: [{ type: FormFieldType.Select, name: 'countryId', options: [{ label: 'Germany', value: 49 }] }],
	})

	// …and a string path string ones.
	define({
		version: 1,
		children: [{ type: FormFieldType.Select, name: 'country', options: [{ label: 'Germany', value: 'de' }] }],
	})

	define({
		version: 1,
		children: [
			{ type: FormFieldType.MultiSelect, name: 'tagIds', options: [{ label: 'Design', value: 1 }], defaultValue: [1] },
		],
	})

	define({
		version: 1,
		children: [{ type: FormFieldType.CheckboxGroup, name: 'tags', options: [{ label: 'Design', value: 'design' }] }],
	})

	define({
		version: 1,
		children: [{ type: FormFieldType.RadioGroup, name: 'countryId', options: [{ label: 'Germany', value: 49 }] }],
	})

	define({
		version: 1,
		children: [
			// @ts-expect-error `countryId` is a number, so its options cannot carry string values
			{ type: FormFieldType.Select, name: 'countryId', options: [{ label: 'Germany', value: 'de' }] },
		],
	})

	define({
		version: 1,
		children: [
			// @ts-expect-error `country` is a string, so its options cannot carry number values
			{ type: FormFieldType.Select, name: 'country', options: [{ label: 'Germany', value: 49 }] },
		],
	})

	define({
		version: 1,
		children: [
			{
				type: FormFieldType.MultiSelect,
				name: 'tagIds',
				options: [{ label: 'Design', value: 1 }],
				// @ts-expect-error `tagIds` is number[], so a string defaultValue entry is illegal
				defaultValue: ['1'],
			},
		],
	})

	define({
		version: 1,
		children: [
			// @ts-expect-error `tags` is string[], so its options cannot carry number values
			{ type: FormFieldType.CheckboxGroup, name: 'tags', options: [{ label: 'Design', value: 1 }] },
		],
	})

	define({
		version: 1,
		children: [
			// @ts-expect-error `countryId` is a number, so a string defaultValue is illegal
			{ type: FormFieldType.Select, name: 'countryId', options: [{ label: 'Germany', value: 49 }], defaultValue: 'de' },
		],
	})

	expectTypeOf(define).toBeFunction()
})
