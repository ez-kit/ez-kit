import { render, screen } from '@testing-library/react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { createSchemaForm } from './create-schema-form'
import { FormProvider, useFormContext } from './form-context'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { NoRegistry } from './contract'
import type { FormContextApi } from './form-context'
import type { FormInstance } from './form-instance'
import type { AnyFormProps, FormControlledProps } from './form-props'
import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

const { Form, useForm } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

function ValueProbe({ testId }: { testId: string }): ReactNode {
	const form = useFormContext()
	return (
		<form.Subscribe selector={(state) => JSON.stringify(state.values)}>
			{(values) => <output data-testid={testId}>{values}</output>}
		</form.Subscribe>
	)
}

describe('useFormContext', () => {
	it('reads the form a <Form> renders', () => {
		render(<Form defaultValues={{ email: 'a@b.c' }}>{() => <ValueProbe testId='probe' />}</Form>)
		expect(screen.getByTestId('probe').textContent).toBe('{"email":"a@b.c"}')
	})

	it('reads the form a FormProvider passes, without rendering a <form>', () => {
		function Host(): ReactNode {
			const form = useForm({ defaultValues: { n: 1 } })
			return (
				<FormProvider form={form}>
					<ValueProbe testId='probe' />
				</FormProvider>
			)
		}
		const { container } = render(<Host />)
		expect(screen.getByTestId('probe').textContent).toBe('{"n":1}')
		expect(container.querySelector('form')).toBeNull()
	})

	it('reads the form a controlled <Form form> passes, and its SubmitButton finds it', async () => {
		const onSubmit = vi.fn()
		function Host(): ReactNode {
			const form = useForm({
				defaultValues: { n: 1 },
				onSubmit: ({ value }) => {
					onSubmit(value)
				},
			})
			return (
				<Form form={form}>
					<ValueProbe testId='probe' />
					<form.SubmitButton>Save</form.SubmitButton>
				</Form>
			)
		}
		render(<Host />)
		expect(screen.getByTestId('probe').textContent).toBe('{"n":1}')
		screen.getByRole('button', { name: 'Save' }).click()
		await vi.waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ n: 1 })
		})
	})

	it('takes a whole form instance in controlled <Form form>, not just a handleSubmit', () => {
		expectTypeOf<FormControlledProps<{ n: number }>['form']>().toEqualTypeOf<
			FormInstance<{ n: number }, NoRegistry, NoRegistry>
		>()
		const handleSubmit = (): Promise<void> => Promise.resolve()
		// @ts-expect-error -- an object with only `handleSubmit` is not a form the context can serve
		const _element = <Form form={{ handleSubmit }}>{null}</Form>
	})

	it('takes a form whose values hold an array', () => {
		function Host(): ReactNode {
			const form = useForm({ defaultValues: { tags: ['a'] } })
			return (
				<FormProvider form={form}>
					<ValueProbe testId='probe' />
				</FormProvider>
			)
		}
		render(<Host />)
		expect(screen.getByTestId('probe').textContent).toBe('{"tags":["a"]}')
	})

	it('lets a wrapper typed AnyFormProps take a form whose values hold an array', () => {
		function Wrapper(props: AnyFormProps): ReactNode {
			return <Form {...(props as FormControlledProps)} />
		}
		function Host(): ReactNode {
			const form = useForm({ defaultValues: { tags: ['a'] } })
			return (
				<Wrapper form={form}>
					<ValueProbe testId='probe' />
				</Wrapper>
			)
		}
		render(<Host />)
		expect(screen.getByTestId('probe').textContent).toBe('{"tags":["a"]}')
	})

	it('returns the nearest form when forms nest', () => {
		function Inner(): ReactNode {
			const inner = useForm({ defaultValues: { inner: true } })
			return (
				<FormProvider form={inner}>
					<ValueProbe testId='inner' />
				</FormProvider>
			)
		}
		render(
			<Form defaultValues={{ outer: true }}>
				{() => (
					<>
						<ValueProbe testId='outer' />
						<Inner />
					</>
				)}
			</Form>,
		)
		expect(screen.getByTestId('outer').textContent).toBe('{"outer":true}')
		expect(screen.getByTestId('inner').textContent).toBe('{"inner":true}')
	})

	it('throws a named error outside every form', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		try {
			expect(() => render(<ValueProbe testId='probe' />)).toThrow(
				'useFormContext() must be called inside <Form>, <SchemaForm> or <FormProvider>',
			)
		} finally {
			error.mockRestore()
		}
	})

	it('types values, base API and built-in fields through the optional generic', () => {
		type Guest = { name: string; seats: number; tags: { label: string }[] }
		function Hint(): ReactNode {
			const form = useFormContext<Guest>()
			expectTypeOf(form.state.values).toEqualTypeOf<Guest>()
			return (
				<>
					<form.TextField name='name' />
					<form.TextField
						// @ts-expect-error -- `seats` holds a number
						name='seats'
					/>
					<form.Field name='seats'>{({ value }) => value.toFixed()}</form.Field>
					<form.Subscribe selector={(state) => state.values.seats}>{(seats) => seats.toFixed()}</form.Subscribe>
				</>
			)
		}
		expectTypeOf(Hint).toBeFunction()
	})

	it('without the generic keeps unknown values and no fields', () => {
		expectTypeOf<FormContextApi['state']['values']>().toEqualTypeOf<unknown>()
		expectTypeOf<FormContextApi>().toHaveProperty('Subscribe')
		expectTypeOf<FormContextApi>().toHaveProperty('handleSubmit')
		expectTypeOf<FormContextApi>().not.toHaveProperty('TextField')
		expectTypeOf<FormContextApi<{ a: string }>>().toHaveProperty('TextField')
	})

	it('is a cast: the generic returns the same instance', () => {
		const seen: unknown[] = []
		function Probe(): ReactNode {
			seen.push(useFormContext(), useFormContext<{ email: string }>())
			return null
		}
		render(<Form defaultValues={{ email: '' }}>{() => <Probe />}</Form>)
		expect(seen[0]).toBe(seen[1])
	})

	it('is provided by <SchemaForm>', () => {
		const { SchemaForm } = createSchemaForm({
			FormElement: testFormElement,
			fields: testFields,
			components: testComponents,
		})
		const schema: FormSchema<{ name: string }> = {
			version: 1,
			children: [{ type: 'block', component: 'probe' }],
		}
		render(
			<SchemaForm
				schema={schema}
				blocks={{ probe: () => <ValueProbe testId='probe' /> }}
				defaultValues={{ name: 'Ann' }}
				onSubmit={() => {}}
			/>,
		)
		expect(screen.getByTestId('probe').textContent).toBe('{"name":"Ann"}')
	})

	it('is returned by createForm as FormProvider', () => {
		expect(
			createForm({ FormElement: testFormElement, fields: testFields, components: testComponents }).FormProvider,
		).toBe(FormProvider)
	})
})
