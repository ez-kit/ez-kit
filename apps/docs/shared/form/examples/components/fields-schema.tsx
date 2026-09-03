'use client'

import { useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

type Profile = {
	name: string
	age: number
	bio: string
	role: string
	newsletter: boolean
	notifications: boolean
	plan: string
	volume: number
}

const ROLES = [
	{ label: 'Viewer', value: 'viewer' },
	{ label: 'Editor', value: 'editor' },
	{ label: 'Admin', value: 'admin' },
]

const PLANS = [
	{ label: 'Free', value: 'free' },
	{ label: 'Pro', value: 'pro' },
	{ label: 'Enterprise', value: 'enterprise' },
]

/**
 * Every built-in field kind that has a scalar value, as a document — the schema twin of
 * `components/fields.tsx`. One node per field, same labels, same options, same bounds.
 */
const schema = defineFormSchema<Profile>()({
	version: 1,
	children: [
		{
			type: FormFieldType.Text,
			name: 'name',
			label: 'Full name',
			placeholder: 'Ada Lovelace',
			defaultValue: '',
		},
		{
			type: FormFieldType.Number,
			name: 'age',
			label: 'Age',
			min: 0,
			max: 130,
			defaultValue: 30,
		},
		{
			type: FormFieldType.Textarea,
			name: 'bio',
			label: 'Bio',
			rows: 3,
			placeholder: 'A short introduction…',
			defaultValue: '',
		},
		{
			type: FormFieldType.Select,
			name: 'role',
			label: 'Role',
			options: ROLES,
			placeholder: 'Pick a role',
			defaultValue: 'viewer',
		},
		{
			type: FormFieldType.Checkbox,
			name: 'newsletter',
			label: 'Send me the newsletter',
			defaultValue: false,
		},
		{
			type: FormFieldType.Switch,
			name: 'notifications',
			label: 'Enable notifications',
			description: 'Toggle email and in-app alerts.',
			defaultValue: true,
		},
		{
			type: FormFieldType.RadioGroup,
			name: 'plan',
			label: 'Plan',
			options: PLANS,
			defaultValue: 'free',
		},
		{
			type: FormFieldType.Slider,
			name: 'volume',
			label: 'Volume',
			description: 'Drag the thumb to set a value between 0 and 100.',
			min: 0,
			max: 100,
			step: 5,
			defaultValue: 50,
		},
		{ type: 'submit', label: 'Save' },
	],
})

export function FieldsSchemaExample() {
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
