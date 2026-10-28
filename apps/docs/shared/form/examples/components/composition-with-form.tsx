'use client'

import { useState } from 'react'
import { z } from 'zod'

import { Form, revalidateLogic, withForm } from 'shared/form/FormKit'

type Sent = { to: string; value: unknown }

type Profile = { firstName: string; lastName: string; email: string; phone: string }

const PROFILE_DEFAULTS: Profile = { firstName: '', lastName: '', email: '', phone: '' }

const NamePart = withForm({
	defaultValues: PROFILE_DEFAULTS,
	render: ({ form }) => (
		<form.Section title='Name'>
			<form.TextField
				name='firstName'
				label='First name'
			/>
			<form.TextField
				name='lastName'
				label='Last name'
			/>
		</form.Section>
	),
})

const ContactPart = withForm({
	defaultValues: PROFILE_DEFAULTS,
	render: ({ form }) => (
		<form.Section title='Contact'>
			<form.TextField
				name='email'
				label='Email'
			/>
			<form.TextField
				name='phone'
				label='Phone'
			/>
		</form.Section>
	),
})

export function WithFormExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={PROFILE_DEFAULTS}
			onSubmit={({ value }) => {
				setSent({ to: 'saveProfile', value })
			}}
		>
			{(form) => (
				<>
					<NamePart form={form} />
					<ContactPart form={form} />
					<form.SubmitButton>Save profile</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}

const profileSchema = z.object({
	firstName: z.string().min(1, 'Enter a first name'),
	lastName: z.string().min(1, 'Enter a last name'),
	email: z.email('Enter a valid email address'),
	phone: z.string().regex(/^\+?\d{7,15}$/, 'Seven to fifteen digits'),
})

export function WithFormValidationExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={PROFILE_DEFAULTS}
			validationLogic={revalidateLogic()}
			validators={{ onDynamic: profileSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'saveProfile', value })
			}}
		>
			{(form) => (
				<>
					<NamePart form={form} />
					<ContactPart form={form} />
					<form.SubmitButton>Save profile</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}

type Order = {
	item: string
	quantity: number
	delivery: 'courier' | 'pickup'
	address: { street: string; city: string }
	store: string
}

const ORDER_DEFAULTS: Order = {
	item: '',
	quantity: 1,
	delivery: 'courier',
	address: { street: '', city: '' },
	store: '',
}

const DELIVERY = [
	{ label: 'Courier', value: 'courier' },
	{ label: 'Pick up in store', value: 'pickup' },
]

const STORES = [
	{ label: 'Central', value: 'central' },
	{ label: 'Harbour', value: 'harbour' },
]

const addressSchema = z.object({
	street: z.string().min(1, 'Enter a street'),
	city: z.string().min(1, 'Enter a city'),
})

const orderSchema = z.intersection(
	z.object({
		item: z.string().min(1, 'Name the item'),
		quantity: z.number().int().min(1, 'At least one'),
	}),
	z.discriminatedUnion('delivery', [
		z.object({ delivery: z.literal('courier'), address: addressSchema, store: z.string() }),
		z.object({
			delivery: z.literal('pickup'),
			address: z.object({ street: z.string(), city: z.string() }),
			store: z.string().min(1, 'Pick a store'),
		}),
	]),
)

const ItemPart = withForm({
	defaultValues: ORDER_DEFAULTS,
	render: ({ form }) => (
		<form.Section title='Item'>
			<form.TextField
				name='item'
				label='Item'
			/>
			<form.NumberField
				name='quantity'
				label='Quantity'
				min={1}
			/>
		</form.Section>
	),
})

const DeliveryPart = withForm({
	defaultValues: ORDER_DEFAULTS,
	render: ({ form }) => (
		<form.Section title='Delivery'>
			<form.RadioGroupField
				name='delivery'
				label='Delivery'
				options={DELIVERY}
			/>
			<form.Subscribe selector={(state) => state.values.delivery}>
				{(delivery) =>
					delivery === 'courier' ? (
						<>
							<form.TextField
								name='address.street'
								label='Street'
							/>
							<form.TextField
								name='address.city'
								label='City'
							/>
						</>
					) : (
						<form.RadioGroupField
							name='store'
							label='Store'
							options={STORES}
						/>
					)
				}
			</form.Subscribe>
		</form.Section>
	),
})

const SummaryPart = withForm({
	defaultValues: ORDER_DEFAULTS,
	render: ({ form }) => (
		<form.Subscribe selector={(state) => state.values}>
			{(order) => (
				<p>
					{`${String(order.quantity)} × ${order.item || '…'}, `}
					{order.delivery === 'courier'
						? `by courier to ${order.address.city || '…'}`
						: `pick up at ${STORES.find((store) => store.value === order.store)?.label ?? '…'}`}
				</p>
			)}
		</form.Subscribe>
	),
})

export function WithFormOrderExample() {
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
					<ItemPart />
					<DeliveryPart />
					<SummaryPart />
					<form.SubmitButton>Place order</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}
