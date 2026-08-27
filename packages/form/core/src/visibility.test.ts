import { expect, test } from 'vitest'

import { FormFieldType } from './field-types'
import { stripHiddenValues, visibleFieldNames } from './visibility'

import type { FormSchema } from './schema'

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

test('dotted field names are stripped only if top-level key is owned by schema', () => {
	type NestedValues = { clientType: string; 'company.inn': string; note: string }
	const nestedSchema: FormSchema<NestedValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'clientType' },
			{
				type: 'section',
				when: { field: 'clientType', eq: 'business' },
				children: [{ type: FormFieldType.Text, name: 'company.inn' }],
			},
			{ type: FormFieldType.Text, name: 'note' },
		],
	}

	const nestedValues: NestedValues = {
		clientType: 'person',
		'company.inn': '12345',
		note: 'test',
	}
	const result = stripHiddenValues(nestedSchema, nestedValues)
	expect(result).toEqual({
		clientType: 'person',
		note: 'test',
	})
	expect(result).not.toHaveProperty('company.inn')
})
