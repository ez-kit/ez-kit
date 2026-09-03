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

test('v1: hidden fields addressed by dotted paths still reach onSubmit inside their parent object', () => {
	// Top-level keys only — the schema owns 'company.inn', not 'company'.
	// When 'company.inn' is hidden, the parent 'company' object is not owned so it passes through,
	// leaving the hidden value untouched inside it.
	type NestedValues = { clientType: string; company: { inn: string } }
	const nestedSchema: AnyFormSchema<NestedValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'clientType' },
			{
				type: FormFieldType.Text,
				name: 'company.inn',
				when: { field: 'clientType', eq: 'business' },
			},
		],
	}

	const nestedValues: NestedValues = {
		clientType: 'person',
		company: { inn: '77' },
	}
	const result = stripHiddenValues(nestedSchema, nestedValues)
	// 'company' is not a top-level key owned by the schema, so it passes through
	expect(result.company.inn).toBe('77')
})
