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

test('options and optionsFrom are mutually exclusive, and one of them is required', () => {
	type SelectValues = { city: string }
	const define = defineFormSchema<SelectValues>()

	define({
		version: 1,
		children: [{ type: FormFieldType.Select, name: 'city', options: [{ label: 'Moscow', value: 'msk' }] }],
	})

	// The bare-string spelling and the object one are both accepted.
	define({ version: 1, children: [{ type: FormFieldType.Select, name: 'city', optionsFrom: 'cities' }] })
	define({
		version: 1,
		children: [
			{
				type: FormFieldType.Select,
				name: 'city',
				optionsFrom: { source: 'dictionary', params: { domain: 'cities' }, dependsOn: { country: 'country' } },
			},
		],
	})

	define({
		version: 1,
		children: [
			{
				type: FormFieldType.Select,
				name: 'city',
				options: [{ label: 'Moscow', value: 'msk' }],
				// @ts-expect-error a node carries `options` or `optionsFrom`, never both
				optionsFrom: 'cities',
			},
		],
	})

	// @ts-expect-error a select-like node needs one of the two
	define({ version: 1, children: [{ type: FormFieldType.Select, name: 'city' }] })

	expectTypeOf(define).toBeFunction()
})

test('creatable is a string-list feature, rejected on a numeric one', () => {
	type Tagged = { tag: string; priority: number }
	const define = defineFormSchema<Tagged>()

	define({
		version: 1,
		children: [
			{
				type: FormFieldType.Select,
				name: 'tag',
				searchable: true,
				creatable: true,
				createLabel: { key: 'tags.create' },
				options: [{ label: 'Bug', value: 'bug' }],
			},
		],
	})

	define({
		version: 1,
		children: [
			{
				type: FormFieldType.Select,
				name: 'priority',
				// @ts-expect-error typed text is a string; a numeric field would have to invent an id
				creatable: true,
				options: [{ label: 'High', value: 1 }],
			},
		],
	})

	expectTypeOf(define).toBeFunction()
})
