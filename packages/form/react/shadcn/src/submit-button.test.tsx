import { FormProvider } from '@ez-kit/form-react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SubmitButton } from './blocks/form-parts'

import { Form, useForm } from './index'

import type { ReactNode } from 'react'

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('SubmitButton', () => {
	it('submits once inside a <Form>', async () => {
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={{ name: 'a' }}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{() => <SubmitButton>Save</SubmitButton>}
			</Form>,
		)
		await userEvent.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})
		await tick()
		expect(onSubmit).toHaveBeenCalledTimes(1)
		expect(screen.getByRole('button', { name: 'Save' }).getAttribute('data-slot')).toBe('form-submit')
	})

	it('submits once under a FormProvider with no <form>', async () => {
		const onSubmit = vi.fn()
		function Host(): ReactNode {
			const form = useForm({
				defaultValues: { name: 'a' },
				onSubmit: ({ value }) => {
					onSubmit(value)
				},
			})
			return (
				<FormProvider form={form}>
					<SubmitButton>Save</SubmitButton>
				</FormProvider>
			)
		}
		const { container } = render(<Host />)
		expect(container.querySelector('form')).toBeNull()
		await userEvent.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})
		await tick()
		expect(onSubmit).toHaveBeenCalledTimes(1)
	})

	it('is disabled when told to be', () => {
		render(<Form defaultValues={{}}>{() => <SubmitButton disabled>Save</SubmitButton>}</Form>)
		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
	})
})
