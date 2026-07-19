'use client'

import { useForm } from '@ez-kit/form-shadcn'

const ROLES = [
	{ label: 'Viewer', value: 'viewer' },
	{ label: 'Editor', value: 'editor' },
	{ label: 'Admin', value: 'admin' },
]

export default function FieldsExample() {
	const form = useForm({
		defaultValues: { name: '', age: 30, bio: '', role: 'viewer', newsletter: false },
	})

	return (
		<form.Form>
			<form.TextField
				name='name'
				label='Full name'
				placeholder='Ada Lovelace'
			/>
			<form.NumberField
				name='age'
				label='Age'
				min={0}
				max={130}
			/>
			<form.TextareaField
				name='bio'
				label='Bio'
				rows={3}
				placeholder='A short introduction…'
			/>
			<form.SelectField
				name='role'
				label='Role'
				options={ROLES}
				placeholder='Pick a role'
			/>
			<form.CheckboxField
				name='newsletter'
				label='Send me the newsletter'
			/>

			{/* Reading live form state through the native Subscribe API. */}
			<form.Subscribe selector={(state) => state.values}>
				{(values) => <pre className='rounded-md bg-fd-muted p-3 text-xs'>{JSON.stringify(values, null, 2)}</pre>}
			</form.Subscribe>
		</form.Form>
	)
}
