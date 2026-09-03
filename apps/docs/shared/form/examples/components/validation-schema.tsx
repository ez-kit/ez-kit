'use client'

import { useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer, TextInputType } from 'shared/form/FormKit'

type Signup = {
	email: string
	age: number
	terms: boolean
}

/**
 * The same three fields as the JSX example, validated by the document's **named rules**
 * instead of a standard-schema validator.
 *
 * Each `validate` block is data, so it survives `JSON.stringify` and can arrive from a
 * backend. `buildValidator` compiles the whole document into one Standard Schema validator
 * and `FormRenderer` attaches it to both `onChange` and `onSubmit`, where the JSX twin
 * attaches zod to `onChange` alone — the extra pass at submit changes nothing for a
 * synchronous validator, it only closes the gap for a field never touched.
 *
 * Where the two differ, and why:
 *
 * - `z.email()` becomes `format: 'email'` plus `required: true`. `format` alone skips an
 *   empty value (an optional field that is blank has nothing to check), so the emptiness
 *   half has to be stated separately.
 * - `z.number().min(18)` becomes `min: 18` — the same bound, with the message overridden.
 * - `z.literal(true)` becomes `required: true` on the checkbox: `false` counts as empty, so
 *   an unticked box fails `required` and the `messages.required` override supplies the same
 *   wording.
 *
 * What has no document spelling at all is an **arbitrary predicate** — a zod `refine`, a
 * cross-field check, a checksum. A regular expression is deliberately absent too: one
 * arriving from an untrusted document is a ReDoS hazard. Instead the document *names* a rule
 * — `validate: { rule: 'adult-in-country' }` — and the app supplies the code for it through
 * `FormRenderer`'s `rules` prop (`rules={{ 'adult-in-country': (value, values) => … }}`),
 * returning `true` or the message to show. An unregistered name throws when the validator is
 * built rather than on the user's first keystroke.
 */
const schema = defineFormSchema<Signup>()({
	version: 1,
	children: [
		{
			type: FormFieldType.Text,
			name: 'email',
			label: 'Email',
			placeholder: 'you@example.com',
			inputType: TextInputType.Email,
			defaultValue: '',
			validate: {
				required: true,
				format: 'email',
				messages: { format: 'Enter a valid email address' },
			},
		},
		{
			type: FormFieldType.Number,
			name: 'age',
			label: 'Age',
			defaultValue: 0,
			validate: {
				min: 18,
				messages: { min: 'You must be at least 18' },
			},
		},
		{
			type: FormFieldType.Checkbox,
			name: 'terms',
			label: 'I accept the terms',
			defaultValue: false,
			validate: {
				required: true,
				messages: { required: 'You have to accept the terms' },
			},
		},
		{ type: 'submit', label: 'Submit' },
	],
})

export function ValidationSchemaExample() {
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
