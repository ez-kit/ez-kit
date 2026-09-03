import { expect, test } from 'vitest'

import { FormFieldType } from './field-types'
import { buildValidator } from './validate'

import type { FormSchema } from './schema'

type Values = { email: string; age: number; inn: string }

const schema: FormSchema<Values> = {
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'email', validate: { required: true, format: 'email' } },
		{ type: FormFieldType.Number, name: 'age', validate: { min: 18 } },
		{ type: FormFieldType.Text, name: 'inn', validate: { rule: 'ru-inn' } },
	],
}

const rules = { 'ru-inn': (value: unknown) => value === '77' || 'Invalid tax ID' }

function issuesOf(values: Values): { path: string; message: string }[] {
	const result = buildValidator(schema, { rules })['~standard'].validate(values)
	if (result instanceof Promise) throw new Error('the generated validator must be synchronous')
	return (result.issues ?? []).map((issue) => ({
		path: String(issue.path?.[0]),
		message: issue.message,
	}))
}

test('a valid document produces no issues', () => {
	expect(issuesOf({ email: 'a@b.co', age: 30, inn: '77' })).toEqual([])
})

test('required catches an empty string', () => {
	expect(issuesOf({ email: '', age: 30, inn: '77' })[0]?.path).toBe('email')
})

test('format catches a malformed email', () => {
	expect(issuesOf({ email: 'nope', age: 30, inn: '77' })[0]?.path).toBe('email')
})

test('min catches a small number', () => {
	expect(issuesOf({ email: 'a@b.co', age: 5, inn: '77' })[0]?.path).toBe('age')
})

test('a named rule reports its own message', () => {
	expect(issuesOf({ email: 'a@b.co', age: 30, inn: '00' })[0]?.message).toBe('Invalid tax ID')
})

test('a hidden field is never validated', () => {
	const conditional: FormSchema<Values> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'email' },
			{
				type: FormFieldType.Text,
				name: 'inn',
				when: { field: 'email', eq: 'business' },
				validate: { required: true },
			},
		],
	}
	const result = buildValidator(conditional, {})['~standard'].validate({
		email: 'a@b.co',
		age: 0,
		inn: '',
	})
	if (result instanceof Promise) throw new Error('synchronous')
	expect(result.issues ?? []).toEqual([])
})

test('an unregistered rule key throws when the validator is built', () => {
	expect(() => buildValidator(schema, {})).toThrow(/ru-inn/)
})

test('min and max compare dates as ISO strings', () => {
	const dateSchema: FormSchema<{ startsOn: string }> = {
		version: 1,
		children: [{ type: FormFieldType.Date, name: 'startsOn', validate: { min: '2026-01-01', max: '2026-12-31' } }],
	}
	const validate = (values: { startsOn: string }): string[] => {
		const result = buildValidator(dateSchema)['~standard'].validate(values)
		if (result instanceof Promise) throw new Error('the generated validator must be synchronous')
		return (result.issues ?? []).map((issue) => issue.message)
	}

	expect(validate({ startsOn: '2025-12-31' })).toEqual(['Must be at least 2026-01-01'])
	expect(validate({ startsOn: '2027-01-01' })).toEqual(['Must be at most 2026-12-31'])
	expect(validate({ startsOn: '2026-08-31' })).toEqual([])
})

test('an empty selection fails required, and length constraints count items', () => {
	const listSchema: FormSchema<{ tags: string[] }> = {
		version: 1,
		children: [
			{
				type: FormFieldType.MultiSelect,
				name: 'tags',
				options: [
					{ value: 'a', label: 'A' },
					{ value: 'b', label: 'B' },
					{ value: 'c', label: 'C' },
				],
				validate: { required: true, maxLength: 2 },
			},
		],
	}
	const validate = (values: { tags: string[] }): string[] => {
		const result = buildValidator(listSchema)['~standard'].validate(values)
		if (result instanceof Promise) throw new Error('the generated validator must be synchronous')
		return (result.issues ?? []).map((issue) => issue.message)
	}

	// Without the array case in `isEmpty`, "nothing selected" would satisfy `required`.
	expect(validate({ tags: [] })).toEqual(['This field is required'])
	expect(validate({ tags: ['a', 'b', 'c'] })).toEqual(['Must be at most 2 items'])
	expect(validate({ tags: ['a'] })).toEqual([])
})
