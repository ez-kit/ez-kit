import { FormFieldType } from '@ez-kit/form-core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { createSchemaForm } from './create-schema-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { SchemaFormControlledProps, SchemaFormUncontrolledProps } from './schema/schema-form'
import type { ServerErrors } from './server-errors'
import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

const { Form, useForm } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

const { SchemaForm } = createSchemaForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Values = { email: string; name: string; later: string }

const DEFAULT_VALUES: Values = { email: '', name: '', later: '' }
const MIN_TWO = { minLength: 2 } as const

type Instance = ReturnType<typeof useValuesForm>

type HarnessProps = {
	onForm: (form: Instance) => void
	onSubmit?: (() => void) | undefined
	focusOnError?: boolean | undefined
	showLater?: boolean
}

function useValuesForm({ onSubmit, focusOnError }: Pick<HarnessProps, 'onSubmit' | 'focusOnError'>) {
	return useForm({
		defaultValues: DEFAULT_VALUES,
		onSubmit: () => onSubmit?.(),
		...(focusOnError !== undefined && { focusOnError }),
	})
}

/** A controlled form, so a test can reach `form.setServerErrors` and `form.reset` from outside. */
function Harness({ onForm, onSubmit, focusOnError, showLater = false }: HarnessProps): ReactNode {
	const form = useValuesForm({ onSubmit, focusOnError })
	useEffect(() => {
		onForm(form)
	}, [form, onForm])

	return (
		<Form form={form}>
			<form.TextField
				name='email'
				label='Email'
			/>
			<form.TextField
				name='name'
				label='Name'
				validate={MIN_TWO}
			/>
			{showLater && (
				<form.TextField
					name='later'
					label='Later'
				/>
			)}
			<form.SubmitButton>Save</form.SubmitButton>
			<form.Submit>
				{({ formErrors, canSubmit }) => (
					<>
						<output data-testid='form-errors'>{formErrors.join('|')}</output>
						<output data-testid='can-submit'>{String(canSubmit)}</output>
					</>
				)}
			</form.Submit>
		</Form>
	)
}

function renderHarness(props: Omit<HarnessProps, 'onForm'> = {}) {
	let instance: Instance | undefined
	const onForm = (form: Instance): void => {
		instance = form
	}
	const view = render(
		<Harness
			onForm={onForm}
			{...props}
		/>,
	)
	const form = (): Instance => {
		if (instance === undefined) throw new Error('the form has not rendered')
		return instance
	}
	return { ...view, form, onForm }
}

function formElement(): HTMLFormElement {
	const element = document.querySelector('form')
	if (element === null) throw new Error('no <form> rendered')
	return element
}

function apply(form: Instance, errors: ServerErrors<Values>): void {
	act(() => {
		form.setServerErrors(errors)
	})
}

describe('form.setServerErrors', () => {
	it('shows field errors at once and blocks submitting', () => {
		const { form } = renderHarness()

		apply(form(), { fields: { email: 'Taken', name: ['Too common', 'Reserved'] } })

		expect(screen.getByText('Taken')).toBeInTheDocument()
		expect(screen.getByText('Too common, Reserved')).toBeInTheDocument()
		expect(screen.getByTestId('can-submit')).toHaveTextContent('false')
	})

	it('keeps a field error when the field is focused and left without a change', async () => {
		const user = userEvent.setup()
		const { form } = renderHarness({ focusOnError: false })
		apply(form(), { fields: { email: 'Taken', name: 'Too common' } })

		await user.click(screen.getByLabelText('Email'))
		await user.tab()
		await user.click(screen.getByLabelText('Name'))
		await user.tab()

		expect(screen.getByText('Taken')).toBeInTheDocument()
		expect(screen.getByText('Too common')).toBeInTheDocument()
	})

	it('clears a field error on its first change and does not bring it back on a revert', async () => {
		const user = userEvent.setup()
		const { form } = renderHarness()
		apply(form(), { fields: { email: 'Taken' } })

		await user.type(screen.getByLabelText('Email'), 'a')
		expect(screen.queryByText('Taken')).not.toBeInTheDocument()

		await user.clear(screen.getByLabelText('Email'))
		expect(screen.queryByText('Taken')).not.toBeInTheDocument()
	})

	it('keeps a field error when another field changes', async () => {
		const user = userEvent.setup()
		const { form } = renderHarness()
		apply(form(), { fields: { email: 'Taken' } })

		await user.type(screen.getByLabelText('Name'), 'Ann')

		expect(screen.getByText('Taken')).toBeInTheDocument()
	})

	it('clears every server error before a submit runs', async () => {
		const user = userEvent.setup()
		const seen = vi.fn<(text: string) => void>()
		const { form } = renderHarness({
			onSubmit: () => {
				seen(document.body.textContent)
			},
		})
		apply(form(), { fields: { email: 'Taken' }, form: 'Service unavailable' })

		await user.type(screen.getByLabelText('Name'), 'Ann')
		// The field error keeps the submit button disabled, which blocks implicit submission too —
		// so the `<form>` is submitted directly, as a script or an `action` would.
		fireEvent.submit(formElement())

		await waitFor(() => {
			expect(seen).toHaveBeenCalledTimes(1)
		})
		expect(seen.mock.calls[0]?.[0]).not.toContain('Taken')
		expect(seen.mock.calls[0]?.[0]).not.toContain('Service unavailable')
		expect(screen.queryByText('Taken')).not.toBeInTheDocument()
	})

	it('clears every server error on reset, and nothing comes back on a later change', async () => {
		const user = userEvent.setup()
		const { form } = renderHarness()
		apply(form(), { fields: { email: 'Taken' }, form: 'Service unavailable' })

		act(() => {
			form().reset()
		})
		await user.type(screen.getByLabelText('Name'), 'Ann')

		expect(screen.queryByText('Taken')).not.toBeInTheDocument()
		expect(screen.getByTestId('form-errors')).toHaveTextContent('')
	})

	it('leaves submitting open for an unmounted field, and shows its error once it mounts', async () => {
		const user = userEvent.setup()
		const { form, rerender, onForm } = renderHarness()
		apply(form(), { fields: { later: 'Taken' } })

		expect(screen.getByTestId('can-submit')).toHaveTextContent('true')
		expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()

		rerender(
			<Harness
				onForm={onForm}
				showLater
			/>,
		)
		expect(screen.getByText('Taken')).toBeInTheDocument()

		await user.type(screen.getByLabelText('Later'), 'a')
		expect(screen.queryByText('Taken')).not.toBeInTheDocument()
	})

	it('releases the slot of a field that unmounts, and shows the error again when it comes back', () => {
		const { form, rerender, onForm } = renderHarness({ showLater: true })
		apply(form(), { fields: { later: 'Taken' } })
		expect(screen.getByTestId('can-submit')).toHaveTextContent('false')

		rerender(<Harness onForm={onForm} />)
		expect(screen.getByTestId('can-submit')).toHaveTextContent('true')
		expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()

		rerender(
			<Harness
				onForm={onForm}
				showLater
			/>,
		)
		expect(screen.getByText('Taken')).toBeInTheDocument()
	})

	it('leaves focus alone when the errors name no field', async () => {
		const user = userEvent.setup()
		const { form } = renderHarness()
		await user.type(screen.getByLabelText('Name'), 'a')
		act(() => {
			screen.getByLabelText('Name').blur()
		})

		apply(form(), { form: 'Service unavailable' })
		expect(document.activeElement).toBe(document.body)

		apply(form(), {})
		expect(document.activeElement).toBe(document.body)
	})

	it('focuses the first field with an error after applying', () => {
		const { form } = renderHarness()

		apply(form(), { fields: { name: 'X' } })

		expect(document.activeElement).toBe(screen.getByLabelText('Name'))
	})

	it('leaves focus alone with focusOnError: false', () => {
		const { form } = renderHarness({ focusOnError: false })

		apply(form(), { fields: { name: 'X' } })

		expect(document.activeElement).toBe(document.body)
	})

	it('rejects setServerErrors as a registered key', () => {
		const Noop = () => null
		expect(() => createForm({ fields: { setServerErrors: Noop } as never })).toThrow(
			'createForm: "setServerErrors" is reserved by the form instance and cannot be registered in fields.',
		)
	})
})

describe('ServerErrors types', () => {
	it('names fields by path and takes a message or a list of them', () => {
		expectTypeOf<Instance['setServerErrors']>().parameter(0).toEqualTypeOf<ServerErrors<Values>>()
		expectTypeOf<{ fields: { email: 'x' } }>().toExtend<ServerErrors<Values>>()
		expectTypeOf<{ form: ['a', 'b'] }>().toExtend<ServerErrors<Values>>()
		expectTypeOf<{ fields: { email?: string[] | undefined }; form: string | undefined }>().toExtend<
			ServerErrors<Values>
		>()
		// @ts-expect-error -- not a path
		const wrong: ServerErrors<Values> = { fields: { nope: 'x' } }
		expect(wrong).toBeDefined()
	})
})

type EmailValues = { email: string }

const EMAIL_DEFAULTS: EmailValues = { email: '' }
const EMAIL_TAKEN: ServerErrors<EmailValues> = { fields: { email: 'Taken' } }

type DeclarativeProps = {
	initial?: ServerErrors<EmailValues> | undefined
	onSubmit?: (() => void) | undefined
	onSet?: (set: (errors: ServerErrors<EmailValues> | undefined) => void) => void
}

/** An uncontrolled `<Form>` whose `serverErrors` live in its parent's state. */
function Declarative({ initial, onSubmit, onSet }: DeclarativeProps): ReactNode {
	const [errors, setErrors] = useState(initial)
	useEffect(() => {
		onSet?.(setErrors)
	}, [onSet])

	return (
		<Form
			defaultValues={EMAIL_DEFAULTS}
			serverErrors={errors}
			onSubmit={() => onSubmit?.()}
		>
			{(form) => (
				<>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.SubmitButton>Save</form.SubmitButton>
					<form.Submit>
						{({ formErrors, canSubmit }) => (
							<>
								<output data-testid='form-errors'>{formErrors.join('|')}</output>
								<output data-testid='can-submit'>{String(canSubmit)}</output>
							</>
						)}
					</form.Submit>
				</>
			)}
		</Form>
	)
}

function renderDeclarative(props: Omit<DeclarativeProps, 'onSet'> = {}) {
	let setErrors: ((errors: ServerErrors<EmailValues> | undefined) => void) | undefined
	const onSet = (set: typeof setErrors): void => {
		setErrors = set
	}
	render(
		<Declarative
			{...props}
			onSet={onSet}
		/>,
	)
	return (errors: ServerErrors<EmailValues> | undefined): void => {
		act(() => {
			setErrors?.(errors)
		})
	}
}

describe('the serverErrors option', () => {
	it('applies the errors whenever their reference changes, and only then', async () => {
		const user = userEvent.setup()
		const setErrors = renderDeclarative()
		expect(screen.queryByText('Taken')).not.toBeInTheDocument()

		setErrors(EMAIL_TAKEN)
		expect(screen.getByText('Taken')).toBeInTheDocument()
		expect(document.activeElement).toBe(screen.getByLabelText('Email'))

		await user.type(screen.getByLabelText('Email'), 'a')
		expect(screen.queryByText('Taken')).not.toBeInTheDocument()
		setErrors(EMAIL_TAKEN)
		expect(screen.queryByText('Taken')).not.toBeInTheDocument()

		setErrors({ fields: { email: 'Taken' } })
		expect(screen.getByText('Taken')).toBeInTheDocument()
	})

	it('applies the errors it mounts with and focuses the field', () => {
		renderDeclarative({ initial: EMAIL_TAKEN })

		expect(screen.getByText('Taken')).toBeInTheDocument()
		expect(document.activeElement).toBe(screen.getByLabelText('Email'))
	})

	it('reaches an uncontrolled SchemaForm', () => {
		const schema: FormSchema<EmailValues> = {
			version: 1,
			children: [{ type: FormFieldType.Text, name: 'email', label: 'Email' }],
		}

		render(
			<SchemaForm
				schema={schema}
				defaultValues={EMAIL_DEFAULTS}
				serverErrors={EMAIL_TAKEN}
			/>,
		)

		expect(screen.getByText('Taken')).toBeInTheDocument()
	})

	it('never reaches the <form> element', () => {
		renderDeclarative({ initial: EMAIL_TAKEN })

		expect(formElement().hasAttribute('serverErrors')).toBe(false)
		expect(formElement().hasAttribute('servererrors')).toBe(false)
	})

	it('hands form-level messages to form.Submit without blocking submitting, and a submit clears them', async () => {
		const user = userEvent.setup()
		const seen = vi.fn<(text: string) => void>()
		renderDeclarative({
			initial: { form: 'Service unavailable' },
			onSubmit: () => {
				seen(screen.getByTestId('form-errors').textContent)
			},
		})

		expect(screen.getByTestId('form-errors')).toHaveTextContent('Service unavailable')
		expect(screen.getByTestId('can-submit')).toHaveTextContent('true')
		expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()

		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(seen).toHaveBeenCalledTimes(1)
		})
		expect(seen).toHaveBeenCalledWith('')
		expect(screen.getByTestId('form-errors')).toHaveTextContent('')
	})
})

describe('serverErrors types', () => {
	it('is a useForm option typed by the form data', () => {
		function Probe(): ReactNode {
			useForm({ defaultValues: { a: '' }, serverErrors: { fields: { a: 'x' } } })
			// @ts-expect-error -- not a path
			useForm({ defaultValues: { a: '' }, serverErrors: { fields: { b: 'x' } } })
			return null
		}
		expect(Probe).toBeTypeOf('function')
	})

	it('is not a prop of the controlled <SchemaForm>', () => {
		// An overloaded JSX call reports at the tag, not the attribute, so the absence is asserted directly.
		expectTypeOf<SchemaFormControlledProps<EmailValues>>().not.toHaveProperty('serverErrors')
		expectTypeOf<
			SchemaFormUncontrolledProps<
				EmailValues,
				never,
				never,
				never,
				never,
				never,
				never,
				never,
				never,
				never,
				never,
				never
			>
		>().toHaveProperty('serverErrors')
	})

	it('is not a prop of the controlled <Form>', () => {
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: { a: '' } })
			return (
				<Form
					form={form}
					// @ts-expect-error -- serverErrors is a useForm option
					serverErrors={{ form: 'x' }}
				>
					{null}
				</Form>
			)
		}
		expect(Probe).toBeTypeOf('function')
	})
})
