'use client'

import { useState } from 'react'

import { defineFormSchema, Form, FormFieldType, SchemaForm } from 'shared/form/FormKit'

type Project = { name: string; email: string; plan: string; seats: number; updates: boolean }
const defaults: Project = { name: '', email: '', plan: 'team', seats: 5, updates: true }
const plans = [
	{ label: 'Starter', value: 'starter' },
	{ label: 'Team', value: 'team' },
	{ label: 'Business', value: 'business' },
]
const schema = defineFormSchema<Project>()({
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'name', label: 'Project name', placeholder: 'Acme workspace', defaultValue: '' },
		{
			type: FormFieldType.Text,
			name: 'email',
			label: 'Work email',
			placeholder: 'you@company.com',
			inputType: 'email',
			defaultValue: '',
		},
		{
			type: 'block',
			component: 'Section',
			columns: 2,
			children: [
				{ type: FormFieldType.Select, name: 'plan', label: 'Plan', defaultValue: 'team', options: plans },
				{ type: FormFieldType.Number, name: 'seats', label: 'Team members', defaultValue: 5, min: 1 },
			],
		},
		{ type: FormFieldType.Switch, name: 'updates', label: 'Send product updates', defaultValue: true },
		{ type: 'block', component: 'SubmitButton', props: { children: 'Create workspace' } },
	],
})

export function LandingFormExample() {
	const [saved, setSaved] = useState(false)
	return (
		<>
			<Form
				defaultValues={defaults}
				onSubmit={() => {
					setSaved(true)
				}}
			>
				{(form) => (
					<>
						<form.TextField
							name='name'
							label='Project name'
							placeholder='Acme workspace'
						/>
						<form.TextField
							name='email'
							label='Work email'
							placeholder='you@company.com'
							type='email'
						/>
						<form.Grid columns={2}>
							<form.SelectField
								name='plan'
								label='Plan'
								options={plans}
							/>
							<form.NumberField
								name='seats'
								label='Team members'
								min={1}
							/>
						</form.Grid>
						<form.SwitchField
							name='updates'
							label='Send product updates'
						/>
						<form.SubmitButton>Create workspace</form.SubmitButton>
					</>
				)}
			</Form>
			{saved && (
				<p
					role='status'
					className='mt-3 text-sm text-emerald-600'
				>
					Example submitted — no data was sent.
				</p>
			)}
		</>
	)
}

export function LandingSchemaExample() {
	const [saved, setSaved] = useState(false)
	return (
		<>
			<SchemaForm
				schema={schema}
				onSubmit={() => {
					setSaved(true)
				}}
			/>
			{saved && (
				<p
					role='status'
					className='mt-3 text-sm text-emerald-600'
				>
					Example submitted — no data was sent.
				</p>
			)}
		</>
	)
}
