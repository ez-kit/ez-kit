'use client'

import { defineFormSchema, FormFieldType, FormRenderer } from 'shared/form/FormKit'

type Order = {
	company: string
	vatId: string
	street: string
	zip: string
	city: string
	country: string
	notes: string
	contactName: string
	contactEmail: string
}

const COUNTRIES = [
	{ label: 'Germany', value: 'de' },
	{ label: 'Netherlands', value: 'nl' },
	{ label: 'Poland', value: 'pl' },
]

/**
 * The same layout as `layout`, expressed as data.
 *
 * The one structural difference between the two spellings is where the span is written: a
 * document puts `colSpan` on the node itself, because a node cannot wrap itself, while JSX
 * wraps the child in a `GridItem`. Both end at the kit's `GridItem`, so the DOM matches.
 */
const schema = defineFormSchema<Order>()({
	version: 1,
	children: [
		{
			type: 'section',
			title: 'Company',
			description: 'Three columns — the name takes two of them.',
			columns: 3,
			children: [
				{
					type: FormFieldType.Text,
					name: 'company',
					label: 'Company',
					placeholder: 'Ada Systems GmbH',
					colSpan: 2,
					defaultValue: '',
				},
				{
					type: FormFieldType.Text,
					name: 'vatId',
					label: 'VAT id',
					placeholder: 'DE123456789',
					defaultValue: '',
				},
				{
					type: 'section',
					title: 'Billing address',
					columns: 4,
					colSpan: 3,
					children: [
						{ type: FormFieldType.Text, name: 'street', label: 'Street', colSpan: 3, defaultValue: '' },
						{ type: FormFieldType.Text, name: 'zip', label: 'ZIP', defaultValue: '' },
						{ type: FormFieldType.Text, name: 'city', label: 'City', colSpan: 2, defaultValue: '' },
						{
							type: FormFieldType.Select,
							name: 'country',
							label: 'Country',
							options: COUNTRIES,
							colSpan: 2,
							defaultValue: 'de',
						},
					],
				},
				{
					type: FormFieldType.Textarea,
					name: 'notes',
					label: 'Delivery notes',
					rows: 2,
					colSpan: 3,
					defaultValue: '',
				},
			],
		},
		{
			type: 'section',
			title: 'Contact',
			columns: 2,
			children: [
				{ type: FormFieldType.Text, name: 'contactName', label: 'Name', defaultValue: '' },
				{ type: FormFieldType.Text, name: 'contactEmail', label: 'Email', defaultValue: '' },
			],
		},
		{ type: 'submit', label: 'Save' },
	],
})

export function LayoutSchemaExample() {
	return <FormRenderer schema={schema} />
}
