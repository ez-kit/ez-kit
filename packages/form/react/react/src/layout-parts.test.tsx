import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

const { Form } = createForm({ components: testComponents })

type Values = { email: string; notes: string }

const DEFAULTS: Values = { email: '', notes: '' }

test('a section renders through the kit with its heading and column count', () => {
	render(
		<Form
			defaultValues={DEFAULTS}
			onSubmit={() => {}}
		>
			{(form) => (
				<form.Section
					title='Client'
					description='Who to bill'
					columns={2}
				>
					<form.TextField
						name='email'
						label='Email'
					/>
				</form.Section>
			)}
		</Form>,
	)

	expect(screen.getByTestId('section')).toHaveAttribute('data-columns', '2')
	expect(screen.getByRole('heading', { name: 'Client' })).toBeInTheDocument()
	expect(screen.getByText('Who to bill')).toBeInTheDocument()
})

test('a section without a title renders no heading', () => {
	render(
		<Form
			defaultValues={DEFAULTS}
			onSubmit={() => {}}
		>
			{(form) => (
				<form.Section columns={2}>
					<form.TextField
						name='email'
						label='Email'
					/>
				</form.Section>
			)}
		</Form>,
	)

	expect(screen.queryByRole('heading')).not.toBeInTheDocument()
})

test('a grid item carries its colSpan to the kit and wraps anything, a nested section included', () => {
	render(
		<Form
			defaultValues={DEFAULTS}
			onSubmit={() => {}}
		>
			{(form) => (
				<form.Section columns={3}>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.GridItem colSpan={2}>
						<form.Section columns={2}>
							<form.TextField
								name='notes'
								label='Notes'
							/>
						</form.Section>
					</form.GridItem>
				</form.Section>
			)}
		</Form>,
	)

	// The unwrapped field is a grid cell of its own — only the explicit span is wrapped.
	const items = screen.getAllByTestId('grid-item')
	expect(items).toHaveLength(1)
	expect(items[0]).toHaveAttribute('data-col-span', '2')

	const sections = screen.getAllByTestId('section')
	expect(sections[0]).toHaveAttribute('data-columns', '3')
	expect(sections[1]).toHaveAttribute('data-columns', '2')
})

test('a field keeps its name and value inside a section — layout binds nothing', async () => {
	const user = userEvent.setup()
	const submitted: Values[] = []

	render(
		<Form
			defaultValues={{ ...DEFAULTS, email: 'a@b.c' }}
			onSubmit={({ value }) => {
				submitted.push(value)
			}}
		>
			{(form) => (
				<>
					<form.Section
						title='Client'
						columns={2}
					>
						<form.GridItem colSpan={2}>
							<form.TextField
								name='email'
								label='Email'
							/>
						</form.GridItem>
					</form.Section>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>,
	)

	expect(screen.getByLabelText('Email')).toHaveValue('a@b.c')

	await user.click(screen.getByRole('button', { name: 'Save' }))
	await waitFor(() => {
		expect(submitted).toEqual([{ email: 'a@b.c', notes: '' }])
	})
})
