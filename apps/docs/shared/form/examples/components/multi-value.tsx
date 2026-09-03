'use client'

import { useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

type Profile = {
	tags: string[]
	interests: string[]
}

const TAGS = [
	{ value: 'design', label: 'Design' },
	{ value: 'engineering', label: 'Engineering' },
	{ value: 'research', label: 'Research' },
	{ value: 'support', label: 'Support' },
]

const INTERESTS = [
	{ value: 'code', label: 'Code' },
	{ value: 'writing', label: 'Writing' },
	{ value: 'speaking', label: 'Speaking', disabled: true },
]

/**
 * The two multi-value fields. Both bind to a `string[]` under a **single** `name` — submit and
 * read the payload: one key per field, holding the list.
 *
 * `validate.required` is what makes "nothing selected" a failure: an empty list counts as an
 * empty value, so a required multi-select cannot be satisfied by choosing nothing.
 * `maxLength` counts items here rather than characters.
 */
const schema = defineFormSchema<Profile>()({
	version: 1,
	children: [
		{
			type: 'section',
			title: 'Profile',
			columns: 2,
			children: [
				{
					type: FormFieldType.MultiSelect,
					name: 'tags',
					label: 'Tags',
					description: 'Pick up to two.',
					placeholder: 'Choose tags',
					options: TAGS,
					defaultValue: [],
					validate: { required: true, maxLength: 2 },
				},
				{
					type: FormFieldType.CheckboxGroup,
					name: 'interests',
					label: 'Interests',
					description: 'Every choice on screen at once.',
					options: INTERESTS,
					defaultValue: ['code'],
				},
			],
		},
		{ type: 'submit', label: 'Save' },
	],
})

export function MultiValueExample() {
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
