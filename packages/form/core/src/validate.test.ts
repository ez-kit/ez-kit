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
