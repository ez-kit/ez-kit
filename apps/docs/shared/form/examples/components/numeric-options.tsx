'use client'

import { useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

type Order = {
	countryId: number
	tagIds: number[]
	note: string
}

const COUNTRIES = [
	{ value: 49, label: 'Germany' },
	{ value: 33, label: 'France' },
	{ value: 39, label: 'Italy' },
]

const TAGS = [
	{ value: 1, label: 'Design' },
	{ value: 2, label: 'Engineering' },
	{ value: 3, label: 'Research' },
]

/**
 * Options whose values are **numbers** — the shape a backend-authored document has when its
 * entity ids are integers.
 *
 * `name` is checked against the option values: `countryId` is a `number`, so its options must
 * carry numbers, and `tagIds` is a `number[]`. Submit and read the payload — the ids come back
 * as numbers (`49`, not `'49'`), because the binding layer maps the string a kit reports back
 * to the option it came from rather than coercing it.
 */
const schema = defineFormSchema<Order>()({
	version: 1,
	children: [
		{
			type: 'section',
			title: 'Shipping',
			columns: 2,
			children: [
				{
					type: FormFieldType.Select,
					name: 'countryId',
					label: 'Country',
					placeholder: 'Pick a country',
					options: COUNTRIES,
					defaultValue: 49,
				},
				{
					type: FormFieldType.MultiSelect,
					name: 'tagIds',
					label: 'Tags',
					placeholder: 'Choose tags',
					options: TAGS,
					defaultValue: [1],
				},
				{
					type: FormFieldType.Text,
					name: 'note',
					label: 'Note',
					colSpan: 2,
					placeholder: 'Anything to add?',
					defaultValue: '',
				},
			],
		},
		{ type: 'submit', label: 'Save' },
	],
})

export function NumericOptionsExample() {
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<FormRenderer
				schema={schema}
				onSubmit={({ value }) => {
					setSaved(JSON.stringify(value, null, 2))
				}}
			/>

			{saved === null ? null : <pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{saved}</pre>}
		</div>
	)
}
