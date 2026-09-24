import { describe, expect, test } from 'vitest'

import { FormFieldType } from './field-types'
import { buildValidator } from './validate'

import type { AnyFormSchema, FormSchema } from './schema'

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

describe('arrays', () => {
	const schema = {
		version: 1 as const,
		children: [
			{
				type: 'array' as const,
				name: 'people',
				validate: { minLength: 1 },
				children: [{ type: FormFieldType.Text, name: 'email', validate: { required: true, format: 'email' } }],
			},
		],
	} as unknown as AnyFormSchema<unknown>

	const run = (values: unknown, options?: Parameters<typeof buildValidator>[1]) => {
		const result = buildValidator(schema, options)['~standard'].validate(values)
		return 'issues' in result ? (result.issues ?? []) : []
	}

	test('checks each item separately, and names it by its real path', () => {
		const issues = run({ people: [{ email: 'a@b.co' }, { email: 'nope' }] })
		expect(issues).toHaveLength(1)
		expect(issues[0]?.path).toEqual(['people', 1, 'email'])
	})

	test('emits a numeric index, not the string "1" — a string segment would address a property', () => {
		const [issue] = run({ people: [{ email: 'nope' }] })
		expect(issue?.path?.[1]).toBe(0)
		expect(typeof issue?.path?.[1]).toBe('number')
	})

	test('a constraint on the list itself lands on the list', () => {
		const [issue] = run({ people: [] })
		expect(issue?.path).toEqual(['people'])
		expect(issue?.message).toBe('Must be at least 1 items')
	})

	test('runs a rule on an empty list, where a scalar field would have been skipped', () => {
		const withRule = {
			version: 1 as const,
			children: [{ type: 'array' as const, name: 'people', validate: { rule: 'nonEmpty' }, children: [] }],
		} as unknown as AnyFormSchema<unknown>
		const result = buildValidator(withRule, {
			rules: { nonEmpty: (value) => (Array.isArray(value) && value.length > 0 ? true : 'Add at least one') },
		})['~standard'].validate({ people: [] })
		expect('issues' in result && result.issues?.[0]?.message).toBe('Add at least one')
	})

	test('a cross-item rule points at the offending entries, not at the list', () => {
		const withRule = {
			version: 1 as const,
			children: [{ type: 'array' as const, name: 'people', validate: { rule: 'uniqueEmail' }, children: [] }],
		} as unknown as AnyFormSchema<unknown>
		const result = buildValidator(withRule, {
			rules: {
				uniqueEmail: (value) => {
					const list = value as { email: string }[]
					const duplicates = list
						.map((entry, index) => ({ entry, index }))
						.filter(({ entry, index }) => list.findIndex((other) => other.email === entry.email) !== index)
					return duplicates.length === 0
						? true
						: duplicates.map(({ index }) => ({ path: `[${String(index)}].email`, message: 'Already used' }))
				},
			},
		})['~standard'].validate({ people: [{ email: 'a@b.co' }, { email: 'a@b.co' }] })
		const issues = 'issues' in result ? (result.issues ?? []) : []
		expect(issues).toHaveLength(1)
		expect(issues[0]?.path).toEqual(['people', 1, 'email'])
	})

	test('runs every rule in a list, in order', () => {
		const withRules = {
			version: 1 as const,
			children: [{ type: 'array' as const, name: 'people', validate: { rule: ['first', 'second'] }, children: [] }],
		} as unknown as AnyFormSchema<unknown>
		const result = buildValidator(withRules, {
			rules: { first: () => true, second: () => 'second failed' },
		})['~standard'].validate({ people: [{}] })
		expect('issues' in result && result.issues?.[0]?.message).toBe('second failed')
	})

	test('skips an item hidden by a ./ condition', () => {
		const conditional = {
			version: 1 as const,
			children: [
				{
					type: 'array' as const,
					name: 'people',
					children: [
						{ type: FormFieldType.Text, name: 'kind' },
						{
							type: FormFieldType.Text,
							name: 'vipCode',
							when: { field: './kind', eq: 'vip' },
							validate: { required: true },
						},
					],
				},
			],
		} as unknown as AnyFormSchema<unknown>
		const result = buildValidator(conditional)['~standard'].validate({
			people: [{ kind: 'plain' }, { kind: 'vip' }],
		})
		const issues = 'issues' in result ? (result.issues ?? []) : []
		expect(issues).toHaveLength(1)
		expect(issues[0]?.path).toEqual(['people', 1, 'vipCode'])
	})
})
