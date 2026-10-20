import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { useFormGroup } from './form-group'
import { clearUnmountedGroupErrors } from './group-registry'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import type { NativeGroupApi } from './group-registry'
import type { ReactNode } from 'react'

const { Form, useForm, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Address = { street: string; city: string }
type Checkout = { email: string; separateBilling: boolean; billing: Address }
const CHECKOUT: Checkout = { email: '', separateBilling: false, billing: { street: '', city: '' } }
const STREET_REQUIRED = 'Enter a street'
const CITY_REQUIRED = 'Enter a city'

const addressSchema = testSchema<Address>((address) => [
	...(address.street === '' ? [{ message: STREET_REQUIRED, path: ['street'] }] : []),
	...(address.city === '' ? [{ message: CITY_REQUIRED, path: ['city'] }] : []),
])

const AddressFields = withFieldGroup({
	defaultValues: { street: '', city: '' },
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

afterEach(() => {
	vi.restoreAllMocks()
})

function BlockCheckout({ onSubmit }: { onSubmit: () => void }): ReactNode {
	return (
		<Form
			defaultValues={CHECKOUT}
			onSubmit={onSubmit}
		>
			{(form) => (
				<>
					<form.CheckboxField
						name='separateBilling'
						label='Separate billing'
					/>
					<form.Subscribe selector={(state) => state.values.separateBilling}>
						{(separate) => (separate ? <AddressFields fields='billing' /> : null)}
					</form.Subscribe>
					<form.SubmitButton>Place order</form.SubmitButton>
				</>
			)}
		</Form>
	)
}

async function blurStreet(user: ReturnType<typeof userEvent.setup>): Promise<void> {
	await user.click(screen.getByLabelText('Street'))
	await user.tab()
}

describe('a native group that unmounts', () => {
	it('takes its own errors with it, so the form can submit again', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<BlockCheckout onSubmit={onSubmit} />)

		await user.click(screen.getByLabelText('Separate billing'))
		await blurStreet(user)
		expect(screen.getByText(STREET_REQUIRED)).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled()

		await user.click(screen.getByLabelText('Separate billing'))

		expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled()
		await user.click(screen.getByRole('button', { name: 'Place order' }))
		expect(onSubmit).toHaveBeenCalledTimes(1)
	})

	it('comes back without errors until its validators run again', async () => {
		const user = userEvent.setup()
		render(<BlockCheckout onSubmit={vi.fn()} />)

		await user.click(screen.getByLabelText('Separate billing'))
		await blurStreet(user)
		await user.click(screen.getByLabelText('Separate billing'))
		await user.click(screen.getByLabelText('Separate billing'))

		expect(screen.queryByText(STREET_REQUIRED)).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled()
	})
})

describe('every way to place a native group', () => {
	it('form.FormGroup takes its own errors with it', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={CHECKOUT}
				onSubmit={onSubmit}
			>
				{(form) => (
					<>
						<form.CheckboxField
							name='separateBilling'
							label='Separate billing'
						/>
						<form.Subscribe selector={(state) => state.values.separateBilling}>
							{(separate) =>
								separate ? (
									<form.FormGroup
										name='billing'
										validators={{ onBlur: addressSchema }}
									>
										{(group) => (
											<group.TextField
												name='street'
												label='Street'
											/>
										)}
									</form.FormGroup>
								) : null
							}
						</form.Subscribe>
						<form.SubmitButton>Place order</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(screen.getByLabelText('Separate billing'))
		await blurStreet(user)
		expect(screen.getByText(STREET_REQUIRED)).toBeInTheDocument()
		await user.click(screen.getByLabelText('Separate billing'))
		await user.click(screen.getByRole('button', { name: 'Place order' }))

		expect(onSubmit).toHaveBeenCalledTimes(1)
	})

	it('useFormGroup takes its own errors with it', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		function useCheckoutForm() {
			return useForm({ defaultValues: CHECKOUT, onSubmit })
		}
		function Billing({ form }: { form: ReturnType<typeof useCheckoutForm> }): ReactNode {
			useFormGroup({ form, name: 'billing', validators: { onBlur: addressSchema } })
			return (
				<form.TextField
					name='billing.street'
					label='Street'
				/>
			)
		}
		function Case(): ReactNode {
			const form = useCheckoutForm()
			return (
				<Form form={form}>
					<form.CheckboxField
						name='separateBilling'
						label='Separate billing'
					/>
					<form.Subscribe selector={(state) => state.values.separateBilling}>
						{(separate) => (separate ? <Billing form={form} /> : null)}
					</form.Subscribe>
					<form.SubmitButton>Place order</form.SubmitButton>
				</Form>
			)
		}
		render(<Case />)

		await user.click(screen.getByLabelText('Separate billing'))
		await blurStreet(user)
		expect(screen.getByText(STREET_REQUIRED)).toBeInTheDocument()
		await user.click(screen.getByLabelText('Separate billing'))
		await user.click(screen.getByRole('button', { name: 'Place order' }))

		expect(onSubmit).toHaveBeenCalledTimes(1)
	})
})

const REJECTED = 'Address rejected'
const INCOMPLETE = 'Address incomplete'

const wholeAddressSchema = testSchema<Address>((address) => (address.street === '' ? [{ message: INCOMPLETE }] : []))

function deferredRejection() {
	const pending: ((result: string) => void)[] = []
	const validator = vi.fn(
		() =>
			new Promise<string>((resolve) => {
				pending.push(resolve)
			}),
	)
	const settle = async (): Promise<void> => {
		await act(async () => {
			for (const resolve of pending.splice(0)) resolve(REJECTED)
			await Promise.resolve()
		})
	}
	return { validator, settle }
}

describe('a native group that unmounts, at the edges', () => {
	it('keeps the errors while another mounted group owns the same name', async () => {
		const user = userEvent.setup()
		const Plain = withFieldGroup({
			defaultValues: { street: '', city: '' },
			render: ({ group }) => (
				<group.TextField
					name='city'
					label='City'
				/>
			),
		})
		render(
			<Form
				defaultValues={CHECKOUT}
				onSubmit={vi.fn()}
			>
				{(form) => (
					<form.FormGroup
						name='billing'
						validators={{ onBlur: wholeAddressSchema }}
					>
						{(group) => (
							<>
								<output data-testid='group-errors'>{group.errors.join('|')}</output>
								<group.TextField
									name='street'
									label='Street'
								/>
								<form.CheckboxField
									name='separateBilling'
									label='Separate billing'
								/>
								<form.Subscribe selector={(state) => state.values.separateBilling}>
									{(separate) => (separate ? <Plain fields='billing' /> : null)}
								</form.Subscribe>
								<form.SubmitButton>Place order</form.SubmitButton>
							</>
						)}
					</form.FormGroup>
				)}
			</Form>,
		)

		await user.click(screen.getByLabelText('Separate billing'))
		await blurStreet(user)
		expect(screen.getByTestId('group-errors')).toHaveTextContent(INCOMPLETE)
		await user.click(screen.getByLabelText('Separate billing'))

		expect(screen.getByTestId('group-errors')).toHaveTextContent(INCOMPLETE)
		expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled()
	})

	it('does the same under StrictMode', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<StrictMode>
				<BlockCheckout onSubmit={onSubmit} />
			</StrictMode>,
		)

		await user.click(screen.getByLabelText('Separate billing'))
		await blurStreet(user)
		expect(screen.getByText(STREET_REQUIRED)).toBeInTheDocument()
		await user.click(screen.getByLabelText('Separate billing'))
		await user.click(screen.getByRole('button', { name: 'Place order' }))

		expect(onSubmit).toHaveBeenCalledTimes(1)
	})

	it('does not take back errors from an async check that settles after it unmounted', async () => {
		const user = userEvent.setup()
		const { validator, settle } = deferredRejection()
		const Checked = withFieldGroup({
			defaultValues: { street: '', city: '' },
			validators: { onBlurAsync: validator },
			render: ({ group }) => (
				<group.TextField
					name='street'
					label='Street'
				/>
			),
		})
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={CHECKOUT}
				onSubmit={onSubmit}
			>
				{(form) => (
					<>
						<form.CheckboxField
							name='separateBilling'
							label='Separate billing'
						/>
						<form.Subscribe selector={(state) => state.values.separateBilling}>
							{(separate) => (separate ? <Checked fields='billing' /> : null)}
						</form.Subscribe>
						<form.SubmitButton>Place order</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(screen.getByLabelText('Separate billing'))
		await blurStreet(user)
		expect(validator).toHaveBeenCalled()
		await user.click(screen.getByLabelText('Separate billing'))
		await settle()
		await user.click(screen.getByRole('button', { name: 'Place order' }))

		expect(onSubmit).toHaveBeenCalledTimes(1)
	})
})

type Meta = {
	errorMap: Record<string, unknown>
	errorSourceMap: Record<string, string | undefined>
	isTouched: boolean
}

function metaHost(meta: Meta, mounted: NativeGroupApi[] = [], extra: Record<string, Meta> = {}, live: string[] = []) {
	const store = { fieldMeta: { billing: meta, ...extra } as Record<string, Meta> }
	return {
		store,
		host: {
			formGroupApis: new Set(mounted),
			state: store,
			fieldInfo: Object.fromEntries(live.map((path) => [path, { instance: {} }])),
			setFieldMeta: (name: string, updater: (prev: Meta) => Meta) => {
				const prev = store.fieldMeta[name]
				if (prev !== undefined) store.fieldMeta = { ...store.fieldMeta, [name]: updater(prev) }
			},
		},
	}
}

describe('clearUnmountedGroupErrors', () => {
	const self = { name: 'billing' } as NativeGroupApi

	it('drops every error on the name, whatever its source, and keeps the interaction flags', () => {
		const { store, host } = metaHost({
			errorMap: { onBlur: { street: STREET_REQUIRED }, onSubmit: 'Billing rejected' },
			errorSourceMap: { onBlur: 'field', onSubmit: 'form' },
			isTouched: true,
		})

		clearUnmountedGroupErrors(host as never, 'billing')

		expect(store.fieldMeta.billing).toEqual({ errorMap: {}, errorSourceMap: {}, isTouched: true })
	})

	it('leaves the meta alone while another group on the name is mounted', () => {
		const other = { name: 'billing' } as NativeGroupApi
		const meta: Meta = { errorMap: { onBlur: 'x' }, errorSourceMap: { onBlur: 'field' }, isTouched: true }
		const { store, host } = metaHost(meta, [other])

		clearUnmountedGroupErrors(host as never, 'billing')

		expect(store.fieldMeta.billing).toBe(meta)
	})

	it('leaves the meta alone once the group itself has been mounted again', () => {
		const meta: Meta = { errorMap: { onBlur: 'x' }, errorSourceMap: { onBlur: 'field' }, isTouched: false }
		const { store, host } = metaHost(meta, [self])

		clearUnmountedGroupErrors(host as never, 'billing')

		expect(store.fieldMeta.billing).toBe(meta)
	})

	it('clears the paths inside the branch nothing is mounted on, and leaves the mounted ones and the rest', () => {
		const error = (): Meta => ({ errorMap: { onBlur: 'x' }, errorSourceMap: { onBlur: 'field' }, isTouched: false })
		const { store, host } = metaHost(
			error(),
			[],
			{ 'billing.city': error(), 'billing.street': error(), billingDiffers: error(), email: error() },
			['billing.street'],
		)

		clearUnmountedGroupErrors(host as never, 'billing')

		expect(store.fieldMeta['billing.city']?.errorMap).toEqual({})
		expect(store.fieldMeta['billing.street']?.errorMap).toEqual({ onBlur: 'x' })
		expect(store.fieldMeta.billingDiffers?.errorMap).toEqual({ onBlur: 'x' })
		expect(store.fieldMeta.email?.errorMap).toEqual({ onBlur: 'x' })
	})
})
