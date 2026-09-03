'use client'

import { Form } from 'shared/form/FormKit'

const ROLES = [
	{ label: 'Viewer', value: 'viewer' },
	{ label: 'Editor', value: 'editor' },
	{ label: 'Admin', value: 'admin' },
]

const PLANS = [
	{ label: 'Free', value: 'free' },
	{ label: 'Pro', value: 'pro' },
	{ label: 'Enterprise', value: 'enterprise' },
]

export function FieldsExample() {
	return (
		<Form
			defaultValues={{
				name: '',
				age: 30,
				bio: '',
				role: 'viewer',
				newsletter: false,
				notifications: true,
				plan: 'free',
				volume: 50,
			}}
		>
			{(form) => (
				<>
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
					<form.SwitchField
						name='notifications'
						label='Enable notifications'
						description='Toggle email and in-app alerts.'
					/>
					<form.RadioGroupField
						name='plan'
						label='Plan'
						options={PLANS}
					/>
					<form.SliderField
						name='volume'
						label='Volume'
						description='Drag the thumb to set a value between 0 and 100.'
						min={0}
						max={100}
						step={5}
					/>

					{/* Reading live form state through the native Subscribe API. */}
					<form.Subscribe selector={(state) => state.values}>
						{(values) => (
							<pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>
								{JSON.stringify(values, null, 2)}
							</pre>
						)}
					</form.Subscribe>
				</>
			)}
		</Form>
	)
}
