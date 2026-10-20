import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { prefixClash, prefixClashMessage } from './group-registry'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { ReactNode } from 'react'

const { Form, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Address = { street: string }
type Checkout = { billingDiffers: boolean; billing: Address }
const CHECKOUT: Checkout = { billingDiffers: false, billing: { street: '' } }

const AddressFields = withFieldGroup({
	defaultValues: { street: '' },
	render: ({ group }) => (
		<group.TextField
			name='street'
			label='Street'
		/>
	),
})

function Case({ flag = true }: { flag?: boolean }): ReactNode {
	return (
		<Form defaultValues={CHECKOUT}>
			{(form) => (
				<>
					{flag && (
						<form.CheckboxField
							name='billingDiffers'
							label='Bill elsewhere'
						/>
					)}
					<AddressFields fields='billing' />
				</>
			)}
		</Form>
	)
}

function clashWarnings(error: ReturnType<typeof vi.spyOn>): unknown[][] {
	const message = prefixClashMessage('billing', 'billingDiffers')
	return error.mock.calls.filter(([logged]) => logged === message)
}

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllEnvs()
})

describe('prefixClash', () => {
	it('finds a name that starts with the group name and goes on without a separator', () => {
		expect(prefixClash('billing', ['billing', 'billing.street', 'billingDiffers'])).toBe('billingDiffers')
	})

	it('does not count the group itself or the paths inside it', () => {
		expect(prefixClash('billing', ['billing', 'billing.street', 'billing[0]', 'shipping'])).toBeUndefined()
	})

	it('compares whole paths, so a nested group is checked against its own siblings', () => {
		expect(prefixClash('order.billing', ['order.billingDiffers', 'billingDiffers'])).toBe('order.billingDiffers')
	})
})

describe('a group whose name prefixes another field', () => {
	it('warns once in development, naming both', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const { rerender } = render(<Case />)
		rerender(<Case />)

		expect(clashWarnings(error)).toHaveLength(1)
		expect(prefixClashMessage('billing', 'billingDiffers')).toContain("'billingDiffers'")
	})

	it('warns from the values too, before the other field mounts', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		render(<Case flag={false} />)

		expect(clashWarnings(error)).toHaveLength(1)
	})

	it('stays quiet in production', () => {
		vi.stubEnv('NODE_ENV', 'production')
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		render(<Case />)

		expect(clashWarnings(error)).toHaveLength(0)
	})
})
