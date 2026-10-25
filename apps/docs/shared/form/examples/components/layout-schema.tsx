'use client'

import { defineFormSchema, FormFieldType, SchemaForm } from 'shared/form/FormKit'

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
 * The two structural differences between the spellings are where the grid and the span are
 * written: a document sets `columns` on the block and `colSpan` on the node, because a node
 * cannot wrap itself, while JSX writes the `Grid` and wraps the child in a `Grid.Item`. Both
 * end at the kit's `Grid` and `Grid.Item`, so the DOM matches.
 */
const schema = defineFormSchema<Order>()({
	version: 1,
	children: [
		{
			type: 'block',
			component: 'Section',
			props: { title: 'Company', description: 'Three columns — the name takes two of them.' },
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
					type: 'block',
					component: 'Section',
					props: { title: 'Billing address' },
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
			type: 'block',
			component: 'Section',
			props: { title: 'Contact' },
			columns: 2,
			children: [
				{ type: FormFieldType.Text, name: 'contactName', label: 'Name', defaultValue: '' },
				{ type: FormFieldType.Text, name: 'contactEmail', label: 'Email', defaultValue: '' },
			],
		},
		{ type: 'block', component: 'SubmitButton', props: { children: 'Save' } },
	],
})

export function LayoutSchemaExample() {
	return <SchemaForm schema={schema} />
}
