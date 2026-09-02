'use client'

import { useState } from 'react'

import { defineFormSchema, FormFieldType, FormRenderer, TextInputType } from 'shared/form/FormKit'

import type { DateRangeValue } from '@ez-kit/form-react'

type Registration = {
	fullName: string
	email: string
	notes: string
	plan: string
	billing: string
	teamSize: number
	seats: number
	integrations: string[]
	startOn: string
	trial: DateRangeValue
	topics: string[]
	notifications: boolean
	terms: boolean
}

/**
 * The `showcase` form, to the label, as a document.
 *
 * Nothing here is a component: `children` is an array of plain objects that survives
 * `JSON.stringify` and could just as well have arrived from a backend. Every field kind the
 * JSX API offers has a node `type`, and every prop it takes has a key of the same name —
 * `placeholder`, `rows`, `min`, `max`, `step`, `options` — so the two files read as the same
 * form written twice.
 *
 * Two things are spelled differently rather than dropped. Layout is a `section` node with
 * `columns`, and the kit draws the heading and the grid; in JSX that markup is yours to
 * write. Validation is **named rules** — `required`, `format: 'email'`, `min` — instead of a
 * validator function, because a document has to stay data: arbitrary JS could not be
 * delivered over the wire, so the format names the constraints it knows and the renderer
 * compiles them. The JSX twin expresses these same three rules with a zod schema.
 */
const schema = defineFormSchema<Registration>()({
	version: 1,
	children: [
		{
			type: 'section',
			title: 'Your details',
			description: 'Two columns on the grid; the notes span both.',
			columns: 2,
			children: [
				{
					type: FormFieldType.Text,
					name: 'fullName',
					label: 'Full name',
					placeholder: 'Ada Lovelace',
					defaultValue: '',
					required: true,
					validate: { required: true, messages: { required: 'Tell us who you are' } },
				},
				{
					type: FormFieldType.Text,
					name: 'email',
					label: 'Email',
					placeholder: 'you@example.com',
					inputType: TextInputType.Email,
					defaultValue: '',
					required: true,
					validate: { required: true, format: 'email', messages: { format: 'Enter a valid email address' } },
				},
				{
					type: FormFieldType.Textarea,
					name: 'notes',
					label: 'Anything we should know?',
					placeholder: 'Optional.',
					rows: 3,
					colSpan: 2,
					defaultValue: '',
				},
			],
		},
		{
			type: 'section',
			title: 'Plan',
			columns: 2,
			children: [
				{
					type: FormFieldType.Select,
					name: 'plan',
					label: 'Plan',
					placeholder: 'Pick a plan',
					defaultValue: 'free',
					options: [
						{ label: 'Free', value: 'free' },
						{ label: 'Pro', value: 'pro' },
						{ label: 'Enterprise', value: 'enterprise' },
					],
				},
				{
					type: FormFieldType.Number,
					name: 'teamSize',
					label: 'Team size',
					min: 1,
					max: 500,
					defaultValue: 1,
					required: true,
					validate: { min: 1, messages: { min: 'At least one person' } },
				},
				{
					type: FormFieldType.RadioGroup,
					name: 'billing',
					label: 'Billing',
					defaultValue: 'monthly',
					options: [
						{ label: 'Monthly', value: 'monthly' },
						{ label: 'Yearly', value: 'yearly' },
					],
				},
				{
					type: FormFieldType.Slider,
					name: 'seats',
					label: 'Seats',
					description: 'How many of them get an account on day one.',
					min: 1,
					max: 50,
					step: 1,
					defaultValue: 5,
				},
				{
					type: FormFieldType.MultiSelect,
					name: 'integrations',
					label: 'Integrations',
					placeholder: 'Pick as many as you like',
					colSpan: 2,
					defaultValue: [],
					options: [
						{ label: 'GitHub', value: 'github' },
						{ label: 'Slack', value: 'slack' },
						{ label: 'Linear', value: 'linear' },
					],
				},
			],
		},
		{
			type: 'section',
			title: 'Schedule and preferences',
			columns: 2,
			children: [
				{
					type: FormFieldType.Date,
					name: 'startOn',
					label: 'Start on',
					min: '2026-01-01',
					max: '2026-12-31',
					defaultValue: '2026-03-01',
				},
				{
					type: FormFieldType.DateRange,
					name: 'trial',
					label: 'Trial window',
					min: '2026-01-01',
					max: '2026-12-31',
					defaultValue: { start: '2026-03-01', end: '2026-03-14' },
				},
				{
					type: FormFieldType.CheckboxGroup,
					name: 'topics',
					label: 'Email me about',
					colSpan: 2,
					defaultValue: ['product'],
					options: [
						{ label: 'Product updates', value: 'product' },
						{ label: 'Security advisories', value: 'security' },
						{ label: 'Community digest', value: 'community' },
					],
				},
				{
					type: FormFieldType.Switch,
					name: 'notifications',
					label: 'In-app notifications',
					defaultValue: true,
				},
				{
					type: FormFieldType.Checkbox,
					name: 'terms',
					label: 'I accept the terms',
					defaultValue: false,
				},
			],
		},
		{ type: 'submit', label: 'Create account' },
	],
})

export function ShowcaseSchemaExample() {
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<div className='flex flex-col gap-6'>
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
