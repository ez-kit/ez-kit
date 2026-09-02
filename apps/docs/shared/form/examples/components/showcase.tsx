'use client'

import { useState } from 'react'
import { z } from 'zod'

import { Form, TextInputType } from 'shared/form/FormKit'

import type { DateRangeValue } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

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

/** A headed group of fields on a two-column grid — what a `section` node renders as. */
function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
	return (
		<section className='flex flex-col gap-3'>
			<div className='flex flex-col gap-1'>
				<h3 className='text-sm font-medium'>{title}</h3>
				{description === undefined ? null : <p className='text-xs opacity-70'>{description}</p>}
			</div>
			<div className='grid grid-cols-2 gap-4'>{children}</div>
		</section>
	)
}

/**
 * Every built-in field kind in one form, written in JSX.
 *
 * Its twin — `showcase-schema` — is the identical form expressed as a document, down to the
 * labels, the order, the grid and the three validation rules. Read the two side by side: the
 * fields carry the same props under the same names in both, and what changes is only whether
 * they are written as elements or as data.
 *
 * The grouping is the one thing that has no counterpart. A document says `section` with
 * `columns`, and the kit draws the heading and the grid; the JSX API ships no `<Section>`, so
 * the same layout is your own markup — the local `Section` above, all six lines of it.
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
						<Section
							title='Your details'
							description='Two columns on the grid; the notes span both.'
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
							<div className='col-span-2'>
								<form.TextareaField
									name='notes'
									label='Anything we should know?'
									rows={3}
									placeholder='Optional.'
								/>
							</div>
						</Section>

						<Section title='Plan'>
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
							<div className='col-span-2'>
								<form.MultiSelectField
									name='integrations'
									label='Integrations'
									options={INTEGRATIONS}
									placeholder='Pick as many as you like'
								/>
							</div>
						</Section>

						<Section title='Schedule and preferences'>
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
							<div className='col-span-2'>
								<form.CheckboxGroupField
									name='topics'
									label='Email me about'
									options={TOPICS}
								/>
							</div>
							<form.SwitchField
								name='notifications'
								label='In-app notifications'
							/>
							<form.CheckboxField
								name='terms'
								label='I accept the terms'
							/>
						</Section>

						<form.SubmitButton>Create account</form.SubmitButton>
					</>
				)}
			</Form>

			{saved === null ? null : <pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{saved}</pre>}
		</div>
	)
}
