'use client'

import { useState } from 'react'
import { z } from 'zod'

import { Form, TextInputType } from 'shared/form/FormKit'

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

const PLANS = [
	{ label: 'Free', value: 'free' },
	{ label: 'Pro', value: 'pro' },
	{ label: 'Enterprise', value: 'enterprise' },
]

const BILLING = [
	{ label: 'Monthly', value: 'monthly' },
	{ label: 'Yearly', value: 'yearly' },
]

const INTEGRATIONS = [
	{ label: 'GitHub', value: 'github' },
	{ label: 'Slack', value: 'slack' },
	{ label: 'Linear', value: 'linear' },
]

const TOPICS = [
	{ label: 'Product updates', value: 'product' },
	{ label: 'Security advisories', value: 'security' },
	{ label: 'Community digest', value: 'community' },
]

const DEFAULT_VALUES: Registration = {
	fullName: '',
	email: '',
	notes: '',
	plan: 'free',
	billing: 'monthly',
	teamSize: 1,
	seats: 5,
	integrations: [],
	startOn: '2026-03-01',
	trial: { start: '2026-03-01', end: '2026-03-14' },
	topics: ['product'],
	notifications: true,
	terms: false,
}

/**
 * The three constraints the document spells as named rules, written here as a plain
 * standard-schema validator.
 *
 * A form-level validator has to describe the **whole** value, not just the constrained part —
 * its input type is the form's, so the unconstrained fields still need a line each. The
 * document pays this differently: a `validate` block sits on the field it governs, and a
 * field with nothing to check simply has none.
 */
const validator = z.object({
	fullName: z.string().min(1, 'Tell us who you are'),
	email: z.email('Enter a valid email address'),
	notes: z.string(),
	plan: z.string(),
	billing: z.string(),
	teamSize: z.number().min(1, 'At least one person'),
	seats: z.number(),
	integrations: z.array(z.string()),
	startOn: z.string(),
	trial: z.object({ start: z.string(), end: z.string() }),
	topics: z.array(z.string()),
	notifications: z.boolean(),
	terms: z.boolean(),
})

/**
 * Every built-in field kind in one form, written in JSX.
 *
 * Its twin — `showcase-schema` — is the identical form expressed as a document, down to the
 * labels, the order, the grid and the three validation rules. Read the two side by side: the
 * fields carry the same props under the same names in both, and what changes is only whether
 * they are written as elements or as data.
 *
 * The grouping has a counterpart too: a document says `section` with `columns` and a node
 * carries `colSpan`, JSX writes `<form.Section columns>` and wraps a wide child in
 * `<form.GridItem colSpan>`, and both reach the same kit components — see
 * [Layout](/docs/form/layout).
 */
export function ShowcaseExample() {
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<div className='flex flex-col gap-6'>
			<Form
				defaultValues={DEFAULT_VALUES}
				validators={{ onChange: validator }}
				onSubmit={({ value }) => {
					setSaved(JSON.stringify(value, null, 2))
				}}
			>
				{(form) => (
					<>
						<form.Section
							title='Your details'
							description='Two columns on the grid; the notes span both.'
							columns={2}
						>
							<form.TextField
								name='fullName'
								label='Full name'
								placeholder='Ada Lovelace'
								required
							/>
							<form.TextField
								name='email'
								label='Email'
								placeholder='you@example.com'
								type={TextInputType.Email}
								required
							/>
							<form.GridItem colSpan={2}>
								<form.TextareaField
									name='notes'
									label='Anything we should know?'
									rows={3}
									placeholder='Optional.'
								/>
							</form.GridItem>
						</form.Section>

						<form.Section
							title='Plan'
							columns={2}
						>
							<form.SelectField
								name='plan'
								label='Plan'
								options={PLANS}
								placeholder='Pick a plan'
							/>
							<form.NumberField
								name='teamSize'
								label='Team size'
								min={1}
								max={500}
								required
							/>
							<form.RadioGroupField
								name='billing'
								label='Billing'
								options={BILLING}
							/>
							<form.SliderField
								name='seats'
								label='Seats'
								description='How many of them get an account on day one.'
								min={1}
								max={50}
								step={1}
							/>
							<form.GridItem colSpan={2}>
								<form.MultiSelectField
									name='integrations'
									label='Integrations'
									options={INTEGRATIONS}
									placeholder='Pick as many as you like'
								/>
							</form.GridItem>
						</form.Section>

						<form.Section
							title='Schedule and preferences'
							columns={2}
						>
							<form.DateField
								name='startOn'
								label='Start on'
								min='2026-01-01'
								max='2026-12-31'
							/>
							<form.DateRangeField
								name='trial'
								label='Trial window'
								min='2026-01-01'
								max='2026-12-31'
							/>
							<form.GridItem colSpan={2}>
								<form.CheckboxGroupField
									name='topics'
									label='Email me about'
									options={TOPICS}
								/>
							</form.GridItem>
							<form.SwitchField
								name='notifications'
								label='In-app notifications'
							/>
							<form.CheckboxField
								name='terms'
								label='I accept the terms'
							/>
						</form.Section>

						<form.SubmitButton>Create account</form.SubmitButton>
					</>
				)}
			</Form>

			{saved === null ? null : <pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{saved}</pre>}
		</div>
	)
}
