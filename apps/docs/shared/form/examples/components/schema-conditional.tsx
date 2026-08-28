'use client'

import { defineFormSchema } from '@ez-kit/form-core'
import { useState } from 'react'

import { FormFieldType, FormRenderer } from 'shared/form/FormKit'

type Client = {
	firstName: string
	lastName: string
	clientType: string
	country: string
	inn: string
	vat: string
}

const CLIENT_TYPES = [
	{ value: 'person', label: 'Individual' },
	{ value: 'business', label: 'Company' },
]

const COUNTRIES = [
	{ value: 'RU', label: 'Russia' },
	{ value: 'DE', label: 'Germany' },
]

/**
 * Conditions are **rule objects**, not functions — which is what lets this exact document
 * arrive as JSON from a backend. `when` decides visibility; a hidden field is never
 * validated, and its value is stripped out of the submitted payload (switch to Individual
 * and submit: `inn` and `vat` are gone, though what you typed is still there if you switch
 * back).
 */
const schema = defineFormSchema<Client>()({
	version: 1,
	children: [
		{
			type: 'section',
			title: 'Client',
			columns: 2,
			children: [
				{ type: FormFieldType.Text, name: 'firstName', label: 'First name', defaultValue: '' },
				{ type: FormFieldType.Text, name: 'lastName', label: 'Last name', defaultValue: '' },
				{
					type: FormFieldType.Select,
					name: 'clientType',
					label: 'Type',
					colSpan: 2,
					defaultValue: 'person',
					options: CLIENT_TYPES,
				},
				{
					type: FormFieldType.Select,
					name: 'country',
					label: 'Country',
					colSpan: 2,
					defaultValue: 'RU',
					options: COUNTRIES,
				},
			],
		},
		{
			type: 'section',
			title: 'Company details',
			// The whole section appears only for a company.
			when: { field: 'clientType', eq: 'business' },
			columns: 2,
			children: [
				{
					type: FormFieldType.Text,
					name: 'inn',
					label: 'Tax ID',
					defaultValue: '',
					// `rule` names an implementation registered below — arbitrary logic stays
					// reachable without shipping code inside the document.
					validate: { required: true, rule: 'ru-inn' },
				},
				{
					type: FormFieldType.Text,
					name: 'vat',
					label: 'VAT',
					defaultValue: '',
					// A composite rule: a company, but not a Russian one.
					when: {
						and: [{ field: 'clientType', eq: 'business' }, { not: { field: 'country', eq: 'RU' } }],
					},
				},
			],
		},
		{ type: 'submit', label: 'Save' },
	],
})

/** Ten or twelve digits — enough to show a named rule doing real work. */
function isValidInn(value: unknown): true | string {
	return /^\d{10}(\d{2})?$/u.test(String(value)) || 'A tax ID is 10 or 12 digits'
}

export function SchemaConditionalExample() {
	// Submitted as JSON so the stripping is visible — see `schema-basic.tsx` on why `value`
	// is `unknown` without a `defaultValues` prop to infer from.
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<FormRenderer
				schema={schema}
				rules={{ 'ru-inn': isValidInn }}
				onSubmit={({ value }) => {
					setSaved(JSON.stringify(value, null, 2))
				}}
			/>

			{saved === null ? null : <pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{saved}</pre>}
		</div>
	)
}
