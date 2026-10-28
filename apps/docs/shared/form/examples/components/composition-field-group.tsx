'use client'

import { useState } from 'react'
import { z } from 'zod'

import { Button } from 'shared/form/Button'
import { Form, revalidateLogic, withFieldGroup } from 'shared/form/FormKit'

type Sent = { to: string; value: unknown }

type Address = { street: string; city: string; zip: string }

type Contact = { name: string; address: Address }

const EMPTY_ADDRESS: Address = { street: '', city: '', zip: '' }

const AddressFields = withFieldGroup({
	defaultValues: EMPTY_ADDRESS,
	render: ({ group }) => (
		<>
			<group.TextField
				name='street'
				label='Street'
			/>
			<group.TextField
				name='city'
				label='City'
			/>
			<group.TextField
				name='zip'
				label='ZIP'
			/>
		</>
	),
})

const CONTACT_DEFAULTS: Contact = { name: '', address: { ...EMPTY_ADDRESS } }

export function FieldGroupExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={CONTACT_DEFAULTS}
			onSubmit={({ value }) => {
				setSent({ to: 'saveContact', value })
			}}
		>
			{(form) => (
				<>
					<form.TextField
						name='name'
						label='Name'
					/>
					<form.Section title='Address'>
						<AddressFields fields='address' />
					</form.Section>
					<form.SubmitButton>Save contact</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}

type PasswordPairValues = { password: string; confirm: string }

type SignUp = { login: string; password: string; confirm: string }

const MIN_PASSWORD = 8

const MIN_LOGIN = 3

const passwordPairSchema = z
	.object({ password: z.string().min(MIN_PASSWORD, 'At least eight characters'), confirm: z.string() })
	.refine((pair) => pair.password === pair.confirm, { path: ['confirm'], message: 'Passwords do not match' })

const PASSWORD_PAIR_DEFAULTS: PasswordPairValues = { password: '', confirm: '' }

const PasswordPair = withFieldGroup({
	defaultValues: PASSWORD_PAIR_DEFAULTS,
	validators: { onChange: passwordPairSchema },
	render: ({ group }) => (
		<>
			<group.TextField
				name='password'
				type='password'
				label='Password'
			/>
			<group.TextField
				name='confirm'
				type='password'
				label='Repeat password'
			/>
		</>
	),
})

const SIGN_UP_DEFAULTS: SignUp = { login: '', password: '', confirm: '' }

const signUpSchema = z.intersection(
	z.object({ login: z.string().min(MIN_LOGIN, 'At least three characters') }),
	passwordPairSchema,
)

export function FieldGroupValidationExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={SIGN_UP_DEFAULTS}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: signUpSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'signUp', value })
			}}
		>
			{(form) => (
				<>
					<form.TextField
						name='login'
						label='Login'
					/>
					<PasswordPair fields={{ password: 'password', confirm: 'confirm' }} />
					<form.SubmitButton>Sign up</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}

type Customer = { email: string; shipping: Address; billing: Address }

const addressSchema = z.object({
	street: z.string().min(1, 'Enter a street'),
	city: z.string().min(1, 'Enter a city'),
	zip: z.string().regex(/^\d{5}$/, 'Five digits'),
})

const AddressCard = withFieldGroup({
	defaultValues: EMPTY_ADDRESS,
	validators: { onChange: addressSchema },
	props: { title: '' },
	render: ({ group, title }) => (
		<fieldset>
			<legend>{title}</legend>
			<group.TextField
				name='street'
				label='Street'
			/>
			<group.TextField
				name='city'
				label='City'
			/>
			<group.TextField
				name='zip'
				label='ZIP'
			/>
			<Button onClick={() => void group.handleSubmit()}>{`Save ${title.toLowerCase()}`}</Button>
		</fieldset>
	),
})

const CUSTOMER_DEFAULTS: Customer = {
	email: '',
	shipping: { ...EMPTY_ADDRESS },
	billing: { ...EMPTY_ADDRESS },
}

const customerSchema = z.object({
	email: z.email('Enter a valid email address'),
	shipping: addressSchema,
	billing: addressSchema,
})

export function FieldGroupAddressBookExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={CUSTOMER_DEFAULTS}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: customerSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'saveCustomer', value })
			}}
		>
			{(form) => (
				<>
					<form.TextField
						name='email'
						label='Email'
					/>
					<AddressCard
						fields='shipping'
						title='Shipping'
						onGroupSubmit={({ value }) => {
							setSent({ to: 'saveShipping', value })
						}}
					/>
					<AddressCard
						fields='billing'
						title='Billing'
						onGroupSubmit={({ value }) => {
							setSent({ to: 'saveBilling', value })
						}}
					/>
					<form.SubmitButton>Save customer</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}
