import { expect, test } from 'vitest'

import { FormFieldType } from './field-types'
import { stripHiddenValues, visibleFieldNames } from './visibility'

import type { AnyFormSchema, FormSchema } from './schema'

type Values = { clientType: string; inn: string; note: string }

const schema: FormSchema<Values> = {
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'clientType' },
		{
			type: 'section',
			when: { field: 'clientType', eq: 'business' },
			children: [{ type: FormFieldType.Text, name: 'inn' }],
		},
		{ type: FormFieldType.Text, name: 'note' },
	],
}

test('a field inside a hidden ancestor is hidden even when its own `when` passes', () => {
	expect(visibleFieldNames(schema, { clientType: 'person', inn: '77', note: 'x' })).toEqual(
		new Set(['clientType', 'note']),
	)
})

test('everything is visible when the condition passes', () => {
	expect(visibleFieldNames(schema, { clientType: 'business', inn: '77', note: 'x' })).toEqual(
		new Set(['clientType', 'inn', 'note']),
	)
})

test('stripHiddenValues removes only hidden field keys', () => {
	expect(stripHiddenValues(schema, { clientType: 'person', inn: '77', note: 'x' })).toEqual({
		clientType: 'person',
		note: 'x',
	})
})

test('stripHiddenValues does not mutate its input', () => {
	const values = { clientType: 'person', inn: '77', note: 'x' }
	stripHiddenValues(schema, values)
	expect(values.inn).toBe('77')
})

test('keys no field node owns survive stripping', () => {
	const values = { clientType: 'person', inn: '77', note: 'x', meta: 1 } as unknown as Values
	expect(stripHiddenValues(schema, values)).toHaveProperty('meta', 1)
})

test('strips a hidden field addressed by a dotted path, out of its parent object', () => {
	// Before arrays this leaked: only top-level keys were considered, so a hidden 'company.inn'
	// rode along inside an unowned 'company'. Nesting was opt-in then; inside an array item it is
	// unavoidable, so the walk had to become path-aware and this case was fixed with it.
	type NestedValues = { clientType: string; company: { inn: string; name: string } }
	const nestedSchema: AnyFormSchema<NestedValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'clientType' },
			{ type: FormFieldType.Text, name: 'company.inn', when: { field: 'clientType', eq: 'business' } },
		],
	}

	const result = stripHiddenValues(nestedSchema, {
		clientType: 'person',
		company: { inn: '77', name: 'Acme' },
	})

	expect(result.company).not.toHaveProperty('inn')
	// A sibling the schema does not own is untouched, and the parent object survives.
	expect(result.company.name).toBe('Acme')
})

test('keeps a hidden field inside one array item from leaking, without renumbering the list', () => {
	type Values = { people: { name: string; kind: string; secret?: string }[] }
	const schema: AnyFormSchema<Values> = {
		version: 1,
		children: [
			{
				type: 'array',
				name: 'people',
				children: [
					{ type: FormFieldType.Text, name: 'name' },
					{ type: FormFieldType.Text, name: 'kind' },
					{ type: FormFieldType.Text, name: 'secret', when: { field: './kind', eq: 'vip' } },
				],
			},
		],
	} as unknown as AnyFormSchema<Values>

	const result = stripHiddenValues(schema, {
		people: [
			{ name: 'A', kind: 'vip', secret: 'keep' },
			{ name: 'B', kind: 'plain', secret: 'drop' },
		],
	})

	expect(result.people).toHaveLength(2)
	expect(result.people[0]).toHaveProperty('secret', 'keep')
	expect(result.people[1]).not.toHaveProperty('secret')
	expect(result.people[1]?.name).toBe('B')
})
