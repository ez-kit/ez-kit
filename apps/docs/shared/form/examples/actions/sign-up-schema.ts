import { defineFormSchema, FormFieldType, TextInputType } from '@ez-kit/form-core'

export type SignUpValues = {
	username: string
	email: string
}

export const signUpSchema = defineFormSchema<SignUpValues>()({
	version: 1,
	children: [
		{
			type: FormFieldType.Text,
			name: 'username',
			label: 'Username',
			description: 'Try admin to see the server reject it.',
			defaultValue: '',
			validate: { required: true, minLength: 3 },
		},
		{
			type: FormFieldType.Text,
			name: 'email',
			label: 'Email',
			inputType: TextInputType.Email,
			defaultValue: '',
			validate: { required: true, format: 'email' },
		},
		{ type: 'submit', label: 'Sign up' },
	],
})
