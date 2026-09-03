'use client'

import { useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer, TextInputType } from 'shared/form/FormKit'

type Signup = {
	accountType: string
	email: string
	password: string
	companyName: string
	vatId: string
	plan: string
	seats: number
	terms: boolean
}

const BUSINESS = 'business'

/**
 * A wizard is a document whose **top-level children are all `step` nodes** — there is no
 * other switch to throw. Mixing a `step` with a loose sibling at that level is a parse error
 * rather than a quietly half-rendered form, because those siblings would belong to no step
 * and never appear.
 *
 * Two behaviours are worth clicking through:
 *
 * - the second step carries `when`, so it exists only for a business account. Hidden, it is
 *   **removed** from the stepper and the remaining steps are renumbered — a form with two
 *   reachable steps never claims "step 3 of 3". Pick "Business" on step one and watch the
 *   stepper grow;
 * - the final button is the `submit` node at the end of the last step, not wizard chrome.
 *   The wizard draws Back and Next; what submits the form is an ordinary node, which is why
 *   it can carry its own label and sits wherever the document puts it.
 *
 * Next validates only the fields of the step being left, so an empty field two steps ahead
 * never turns red before the user has seen it.
 */
const schema = defineFormSchema<Signup>()({
	version: 1,
	children: [
		{
			type: 'step',
			title: 'Account',
			description: 'How you sign in',
			children: [
				{
					type: FormFieldType.RadioGroup,
					name: 'accountType',
					label: 'Account type',
					defaultValue: 'personal',
					options: [
						{ label: 'Personal', value: 'personal' },
						{ label: 'Business', value: BUSINESS },
					],
				},
				{
					type: FormFieldType.Text,
					name: 'email',
					label: 'Email',
					placeholder: 'you@example.com',
					inputType: TextInputType.Email,
					defaultValue: '',
					required: true,
					validate: { required: true, format: 'email' },
				},
				{
					type: FormFieldType.Text,
					name: 'password',
					label: 'Password',
					inputType: TextInputType.Password,
					defaultValue: '',
					required: true,
					validate: { required: true, minLength: 8 },
				},
			],
		},
		{
			type: 'step',
			title: 'Company',
			description: 'Business accounts only',
			when: { field: 'accountType', eq: BUSINESS },
			children: [
				{
					type: FormFieldType.Text,
					name: 'companyName',
					label: 'Company name',
					defaultValue: '',
					required: true,
					validate: { required: true },
				},
				{
					type: FormFieldType.Text,
					name: 'vatId',
					label: 'VAT id',
					placeholder: 'DE123456789',
					defaultValue: '',
				},
			],
		},
		{
			type: 'step',
			title: 'Plan',
			children: [
				{
					type: FormFieldType.Select,
					name: 'plan',
					label: 'Plan',
					placeholder: 'Pick a plan',
					defaultValue: 'pro',
					options: [
						{ label: 'Free', value: 'free' },
						{ label: 'Pro', value: 'pro' },
						{ label: 'Enterprise', value: 'enterprise' },
					],
				},
				{
					type: FormFieldType.Slider,
					name: 'seats',
					label: 'Seats',
					min: 1,
					max: 50,
					step: 1,
					defaultValue: 5,
				},
				{
					type: FormFieldType.Checkbox,
					name: 'terms',
					label: 'I accept the terms',
					defaultValue: false,
					validate: { required: true, messages: { required: 'You have to accept the terms' } },
				},
				{ type: 'submit', label: 'Create account' },
			],
		},
	],
})

export function WizardExample() {
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
