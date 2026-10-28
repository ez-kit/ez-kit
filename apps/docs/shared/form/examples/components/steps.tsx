'use client'

import { useState } from 'react'
import { z } from 'zod'

import { Button } from 'shared/form/Button'
import { Form, revalidateLogic, useStep, withFieldGroup } from 'shared/form/FormKit'

import type { ReactNode } from 'react'
import type { StepsControlsRenderProps, StepsListRenderProps } from 'shared/form/FormKit'

type Sent = { to: string; value: unknown }

const LABELS: Record<string, string> = {
	account: 'Account',
	profile: 'Profile',
	company: 'Company',
	address: 'Address',
	payment: 'Payment',
	confirm: 'Confirm',
}

function Stepper({ steps, current, goTo }: StepsListRenderProps): ReactNode {
	return (
		<ol>
			{steps.map((step) => (
				<li key={step.name}>
					<Button
						onClick={() => {
							goTo(step.name)
						}}
					>
						{`${step.name === current ? '> ' : ''}${LABELS[step.name] ?? step.name}${step.invalid ? ' (!)' : ''}`}
					</Button>
				</li>
			))}
		</ol>
	)
}

function Controls({
	canGoBack,
	isLast,
	isValidating,
	stepErrors,
	formErrors,
	goBack,
	goNext,
	finish,
}: StepsControlsRenderProps & { finish: ReactNode }): ReactNode {
	return (
		<footer>
			{[...stepErrors, ...formErrors].map((message) => (
				<p
					key={message}
					role='alert'
				>
					{message}
				</p>
			))}
			{canGoBack && <Button onClick={goBack}>Back</Button>}
			{isLast ? (
				finish
			) : (
				<Button
					onClick={goNext}
					disabled={isValidating}
				>
					Next
				</Button>
			)}
		</footer>
	)
}

type SignUp = { email: string; name: string; agree: boolean }

const SIGN_UP: SignUp = { email: '', name: '', agree: false }

const signUpSchema = z.object({
	email: z.email('Enter a valid email address'),
	name: z.string().min(1, 'Enter your name'),
	agree: z.literal(true, 'Accept the terms'),
})

export function StepsBasicExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={SIGN_UP}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: signUpSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'signUp', value })
			}}
		>
			{(form) => (
				<form.Steps>
					<form.Steps.List>{(props) => <Stepper {...props} />}</form.Steps.List>
					<form.Step name='account'>
						<form.TextField
							name='email'
							label='Email'
						/>
					</form.Step>
					<form.Step name='profile'>
						<form.TextField
							name='name'
							label='Name'
						/>
					</form.Step>
					<form.Step name='confirm'>
						<form.CheckboxField
							name='agree'
							label='I accept the terms'
						/>
					</form.Step>
					<form.Steps.Controls>
						{(props) => (
							<Controls
								{...props}
								finish={<form.SubmitButton>Sign up</form.SubmitButton>}
							/>
						)}
					</form.Steps.Controls>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</form.Steps>
			)}
		</Form>
	)
}

type Registration = {
	email: string
	type: 'person' | 'company'
	company: { name: string; vat: string }
	card: string
}

const REGISTRATION: Registration = {
	email: '',
	type: 'person',
	company: { name: '', vat: '' },
	card: '',
}

const companySchema = z.object({
	name: z.string().min(1, 'Enter the company name'),
	vat: z.string().regex(/^\d{9}$/, 'Nine digits'),
})

const registrationSchema = z.intersection(
	z.object({
		email: z.email('Enter a valid email address'),
		card: z.string().regex(/^\d{16}$/, 'Sixteen digits'),
	}),
	z.discriminatedUnion('type', [
		z.object({
			type: z.literal('person'),
			company: z.object({ name: z.string(), vat: z.string() }).transform(() => undefined),
		}),
		z.object({ type: z.literal('company'), company: companySchema }),
	]),
)

export function StepsConditionalExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={REGISTRATION}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: registrationSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'register', value: registrationSchema.parse(value) })
			}}
		>
			{(form) => (
				<form.Steps>
					<form.Steps.List>{(props) => <Stepper {...props} />}</form.Steps.List>
					<form.Step name='account'>
						<form.TextField
							name='email'
							label='Email'
						/>
						<form.RadioGroupField
							name='type'
							label='Register as'
							options={[
								{ value: 'person', label: 'A person' },
								{ value: 'company', label: 'A company' },
							]}
						/>
					</form.Step>
					<form.Step
						name='company'
						when={(values) => values.type === 'company'}
					>
						<form.TextField
							name='company.name'
							label='Company name'
						/>
						<form.TextField
							name='company.vat'
							label='VAT number'
						/>
					</form.Step>
					<form.Step name='payment'>
						<form.TextField
							name='card'
							label='Card number'
						/>
					</form.Step>
					<form.Steps.Controls>
						{(props) => (
							<Controls
								{...props}
								finish={<form.SubmitButton>Register</form.SubmitButton>}
							/>
						)}
					</form.Steps.Controls>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</form.Steps>
			)}
		</Form>
	)
}

type Address = { street: string; city: string }

type Order = { shipping: Address; payment: { card: string; cvc: string } }

const EMPTY_ADDRESS: Address = { street: '', city: '' }

const ORDER: Order = { shipping: EMPTY_ADDRESS, payment: { card: '', cvc: '' } }

const addressSchema = z.object({
	street: z.string().min(1, 'Enter a street'),
	city: z.string().min(1, 'Enter a city'),
})

const cardSchema = z.object({
	card: z.string().regex(/^\d{16}$/, 'Sixteen digits'),
	cvc: z.string().regex(/^\d{3}$/, 'Three digits'),
})

const orderSchema = z.object({ shipping: addressSchema, payment: cardSchema })

const AddressFields = withFieldGroup({
	defaultValues: EMPTY_ADDRESS,
	validators: { onBlur: addressSchema },
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
		</>
	),
})

export function StepsBlocksExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={ORDER}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: orderSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'placeOrder', value })
			}}
		>
			{(form) => (
				<form.Steps>
					<form.Steps.List>{(props) => <Stepper {...props} />}</form.Steps.List>
					<form.Step name='address'>
						<AddressFields fields='shipping' />
					</form.Step>
					<form.Step name='payment'>
						<form.FormGroup
							name='payment'
							validators={{ onChange: cardSchema }}
							onGroupSubmit={({ value }) => {
								setSent({ to: 'saveCard', value })
							}}
						>
							{(group) => (
								<>
									<group.TextField
										name='card'
										label='Card number'
									/>
									<group.TextField
										name='cvc'
										label='CVC'
									/>
									<Button onClick={() => void group.handleSubmit()}>Save card</Button>
								</>
							)}
						</form.FormGroup>
					</form.Step>
					<form.Steps.Controls>
						{(props) => (
							<Controls
								{...props}
								finish={<form.SubmitButton>Place order</form.SubmitButton>}
							/>
						)}
					</form.Steps.Controls>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</form.Steps>
			)}
		</Form>
	)
}

export function StepsFreeExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={SIGN_UP}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: signUpSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'signUp', value })
			}}
		>
			{(form) => (
				<form.Steps linear={false}>
					<form.Steps.List>{(props) => <Stepper {...props} />}</form.Steps.List>
					<form.Step name='account'>
						<form.TextField
							name='email'
							label='Email'
						/>
					</form.Step>
					<form.Step name='profile'>
						<form.TextField
							name='name'
							label='Name'
						/>
					</form.Step>
					<form.Step name='confirm'>
						<form.CheckboxField
							name='agree'
							label='I accept the terms'
						/>
					</form.Step>
					<form.Steps.Controls>
						{(props) => (
							<Controls
								{...props}
								finish={<form.SubmitButton>Sign up</form.SubmitButton>}
							/>
						)}
					</form.Steps.Controls>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</form.Steps>
			)}
		</Form>
	)
}

const STEP_NAMES = ['account', 'profile', 'confirm'] as const

function Dot({ name }: { name: string }): ReactNode {
	const { isCurrent, visited, invalid, goTo } = useStep(name)
	const mark = invalid ? '!' : visited ? 'v' : isCurrent ? '>' : '-'
	return <Button onClick={goTo}>{`${mark} ${LABELS[name] ?? name}`}</Button>
}

export function StepsStepperExample() {
	return (
		<Form
			defaultValues={SIGN_UP}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: signUpSchema }}
		>
			{(form) => (
				<form.Steps>
					<nav>
						{STEP_NAMES.map((name) => (
							<Dot
								key={name}
								name={name}
							/>
						))}
					</nav>
					<form.Step name='account'>
						<form.TextField
							name='email'
							label='Email'
						/>
					</form.Step>
					<form.Step name='profile'>
						<form.TextField
							name='name'
							label='Name'
						/>
					</form.Step>
					<form.Step name='confirm'>
						<form.CheckboxField
							name='agree'
							label='I accept the terms'
						/>
					</form.Step>
					<form.Steps.Controls>
						{(props) => (
							<Controls
								{...props}
								finish={<form.SubmitButton>Sign up</form.SubmitButton>}
							/>
						)}
					</form.Steps.Controls>
				</form.Steps>
			)}
		</Form>
	)
}
