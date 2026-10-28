'use client'

import { useState } from 'react'
import { z } from 'zod'

import { Button } from 'shared/form/Button'
import { Form, revalidateLogic, withFieldGroup } from 'shared/form/FormKit'

type Sent = { to: string; value: unknown }

type Payment = { card: string; cvc: string }

type Order = { email: string; payment: Payment }

const ORDER_DEFAULTS: Order = { email: '', payment: { card: '', cvc: '' } }

export function FormGroupExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={ORDER_DEFAULTS}
			onSubmit={({ value }) => {
				setSent({ to: 'placeOrder', value })
			}}
		>
			{(form) => (
				<>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.FormGroup
						name='payment'
						onGroupSubmit={({ value }) => {
							setSent({ to: 'saveCard', value })
						}}
					>
						{(group) => (
							<form.Section title='Payment'>
								<group.TextField
									name='card'
									label='Card number'
								/>
								<group.TextField
									name='cvc'
									label='CVC'
								/>
								<Button onClick={() => void group.handleSubmit()}>Save card</Button>
							</form.Section>
						)}
					</form.FormGroup>
					<form.SubmitButton>Place order</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}

const cardSchema = z.object({
	card: z.string().regex(/^\d{16}$/, 'Sixteen digits'),
	cvc: z.string().regex(/^\d{3}$/, 'Three digits'),
})

const orderSchema = z.object({
	email: z.email('Enter a valid email address'),
	payment: cardSchema,
})

export function FormGroupValidationExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={ORDER_DEFAULTS}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: orderSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'placeOrder', value })
			}}
		>
			{(form) => (
				<>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.FormGroup
						name='payment'
						validators={{ onChange: cardSchema }}
						onGroupSubmit={({ value }) => {
							setSent({ to: 'saveCard', value })
						}}
					>
						{(group) => (
							<form.Section title='Payment'>
								<group.TextField
									name='card'
									label='Card number'
								/>
								<group.TextField
									name='cvc'
									label='CVC'
								/>
								<Button onClick={() => void group.handleSubmit()}>Save card</Button>
							</form.Section>
						)}
					</form.FormGroup>
					<form.SubmitButton>Place order</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}

type PasswordPairValues = { password: string; confirm: string }

type Notifications = { email: boolean; sms: boolean }

type Settings = { displayName: string; security: PasswordPairValues; notifications: Notifications }

const MIN_PASSWORD = 8

const passwordPairSchema = z
	.object({ password: z.string().min(MIN_PASSWORD, 'At least eight characters'), confirm: z.string() })
	.refine((pair) => pair.password === pair.confirm, { path: ['confirm'], message: 'Passwords do not match' })

const notificationsSchema = z
	.object({ email: z.boolean(), sms: z.boolean() })
	.refine((channels) => channels.email || channels.sms, { message: 'Pick at least one channel' })

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

const SETTINGS_DEFAULTS: Settings = {
	displayName: 'Ann',
	security: PASSWORD_PAIR_DEFAULTS,
	notifications: { email: true, sms: false },
}

const settingsSchema = z.object({
	displayName: z.string().min(1, 'Enter a name'),
	security: passwordPairSchema,
	notifications: notificationsSchema,
})

export function FormGroupSettingsExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={SETTINGS_DEFAULTS}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: settingsSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'saveSettings', value })
			}}
		>
			{(form) => (
				<>
					<form.TextField
						name='displayName'
						label='Display name'
					/>
					<form.FormGroup
						name='security'
						onGroupSubmit={({ value }) => {
							setSent({ to: 'changePassword', value })
						}}
					>
						{(group) => (
							<form.Section title='Password'>
								<PasswordPair fields='security' />
								<Button onClick={() => void group.handleSubmit()}>Change password</Button>
							</form.Section>
						)}
					</form.FormGroup>
					<form.FormGroup
						name='notifications'
						validators={{ onChange: notificationsSchema }}
						onGroupSubmit={({ value }) => {
							setSent({ to: 'saveNotifications', value })
						}}
					>
						{(group) => (
							<form.Section title='Notifications'>
								<group.CheckboxField
									name='email'
									label='Email me'
								/>
								<group.CheckboxField
									name='sms'
									label='Text me'
								/>
								{group.errors.map((message) => (
									<p
										key={message}
										role='alert'
									>
										{message}
									</p>
								))}
								<Button onClick={() => void group.handleSubmit()}>Save notifications</Button>
							</form.Section>
						)}
					</form.FormGroup>
					<form.SubmitButton>Save settings</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}
