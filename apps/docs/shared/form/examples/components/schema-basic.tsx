'use client'

import { useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer, TextInputType } from 'shared/form/FormKit'

type Contact = {
	firstName: string
	lastName: string
	email: string
}

/**
 * The whole form as plain data — no JSX, no imported components.
 *
 * `defineFormSchema<Contact>()` is curried so `Contact` is given explicitly while the
 * literal below is still inferred: that is what makes every `name` checkable against the
 * value type it points at. Drop the schema into a database or send it from a backend and it
 * survives `JSON.stringify` unchanged — `FormFieldType.Text` *is* the string `'text'`.
 */
const schema = defineFormSchema<Contact>()({
	version: 1,
	children: [
		{
			type: 'section',
			title: 'Contact',
			description: 'Two columns on the grid; the email spans both.',
			columns: 2,
			children: [
				{
					type: FormFieldType.Text,
					name: 'firstName',
					label: 'First name',
					defaultValue: '',
					validate: { required: true },
				},
				{
					type: FormFieldType.Text,
					name: 'lastName',
					label: 'Last name',
					defaultValue: '',
				},
				{
					type: FormFieldType.Text,
					name: 'email',
					label: 'Email',
					placeholder: 'you@example.com',
					inputType: TextInputType.Email,
					colSpan: 2,
					defaultValue: '',
					validate: { required: true, format: 'email' },
				},
			],
		},
		{ type: 'submit', label: 'Save' },
	],
})

export function SchemaBasicExample() {
	// The submitted payload, shown as JSON. `value` arrives typed `unknown` here because
	// nothing in this element pins the form's value type — the schema alone does not infer
	// it. Pass `defaultValues` (as the JSX API does) when you want `onSubmit` typed.
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
