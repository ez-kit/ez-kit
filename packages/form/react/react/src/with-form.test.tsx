import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { createSchemaForm } from './create-schema-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

const { Form, FormProvider, useForm, withForm } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type SignUp = { login: string; email: string }
const SIGN_UP: SignUp = { login: '', email: '' }

const LoginPart = withForm({
	defaultValues: SIGN_UP,
	render: ({ form }) => (
		<>
			<form.TextField
				name='login'
				label='Login'
			/>
			<form.Subscribe selector={(state) => state.values.login}>{(login) => <output>{login}</output>}</form.Subscribe>
		</>
	),
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('withForm without a form prop (D7)', () => {
	it('takes the form of the <Form> above it', async () => {
		const user = userEvent.setup()
		render(<Form defaultValues={SIGN_UP}>{() => <LoginPart />}</Form>)

		await user.type(screen.getByLabelText('Login'), 'ann')

		expect(screen.getByRole('status')).toHaveTextContent('ann')
	})

	it('takes the form of the <SchemaForm> above it', async () => {
		const user = userEvent.setup()
		// The part is registered as a component and reached from the document as a block; it
		// finds the form through the context `SchemaForm` provides, exactly as under `<Form>`.
		const { SchemaForm } = createSchemaForm({
			FormElement: testFormElement,
			fields: testFields,
			components: { ...testComponents, LoginPart: () => <LoginPart /> },
		})
		const schema: FormSchema<SignUp> = { version: 1, children: [{ type: 'block', component: 'LoginPart' }] }
		render(
			<SchemaForm
				schema={schema}
				defaultValues={SIGN_UP}
			/>,
		)

		await user.type(screen.getByLabelText('Login'), 'cid')

		expect(screen.getByRole('status')).toHaveTextContent('cid')
	})

	it('takes the form of a FormProvider with no <form>', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: SIGN_UP })
			return (
				<FormProvider form={form}>
					<LoginPart />
				</FormProvider>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('Login'), 'bob')

		expect(screen.getByRole('status')).toHaveTextContent('bob')
	})

	it('prefers the form prop over the one in context', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const outer = useForm({ defaultValues: SIGN_UP })
			const inner = useForm({ defaultValues: SIGN_UP })
			return (
				<FormProvider form={outer}>
					<LoginPart form={inner} />
					<outer.Subscribe selector={(state) => state.values.login}>
						{(login) => <p data-testid='outer'>{login}</p>}
					</outer.Subscribe>
				</FormProvider>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('Login'), 'x')

		expect(screen.getByRole('status')).toHaveTextContent('x')
		expect(screen.getByTestId('outer')).toHaveTextContent('')
	})

	it('throws a named error with neither a form prop nor a provider (R68)', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() => render(<LoginPart />)).toThrow(/withForm\(\): the block needs a form/)
	})
})
