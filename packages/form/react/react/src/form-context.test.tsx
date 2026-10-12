import { render, screen } from '@testing-library/react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { FormProvider, useFormContext } from './form-context'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FormContextApi } from './form-context'
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

	it('returns the base API with unknown values', () => {
		expectTypeOf<FormContextApi['state']['values']>().toEqualTypeOf<unknown>()
		expectTypeOf<FormContextApi>().toHaveProperty('Subscribe')
		expectTypeOf<FormContextApi>().toHaveProperty('handleSubmit')
	})

	it('is returned by createForm as FormProvider', () => {
		expect(
			createForm({ FormElement: testFormElement, fields: testFields, components: testComponents }).FormProvider,
		).toBe(FormProvider)
	})
})
