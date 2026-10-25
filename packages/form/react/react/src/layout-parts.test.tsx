import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, expectTypeOf, test } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FormComponents } from './contract'
import type { ReactNode } from 'react'

const { Form } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

type Values = { email: string; notes: string }

const DEFAULTS: Values = { email: '', notes: '' }

test('a section renders through the kit with its heading and description', () => {
	render(
		<Form
			defaultValues={DEFAULTS}
			onSubmit={() => {}}
		>
			{(form) => (
				<form.Section
					title='Client'
					description='Who to bill'
				>
					<form.TextField
						name='email'
						label='Email'
					/>
				</form.Section>
			)}
		</Form>,
	)

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
				<form.Section>
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

test('a grid carries its columns and each item its colSpan, and an item wraps anything', () => {
	render(
		<Form
			defaultValues={DEFAULTS}
			onSubmit={() => {}}
		>
			{(form) => (
				<form.Grid columns={3}>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.Grid.Item colSpan={2}>
						<form.Section title='Notes'>
							<form.Grid columns={2}>
								<form.TextField
									name='notes'
									label='Notes'
								/>
							</form.Grid>
						</form.Section>
					</form.Grid.Item>
				</form.Grid>
			)}
		</Form>,
	)

	// The unwrapped field is a grid cell of its own — only the explicit span is wrapped.
	const items = screen.getAllByTestId('grid-item')
	expect(items).toHaveLength(1)
	expect(items[0]).toHaveAttribute('data-col-span', '2')

	const grids = screen.getAllByTestId('grid')
	expect(grids[0]).toHaveAttribute('data-columns', '3')
	expect(grids[1]).toHaveAttribute('data-columns', '2')
})

test('a field keeps its name and value inside a section and a grid — layout binds nothing', async () => {
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
					<form.Section title='Client'>
						<form.Grid columns={2}>
							<form.Grid.Item colSpan={2}>
								<form.TextField
									name='email'
									label='Email'
								/>
							</form.Grid.Item>
						</form.Grid>
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

test('the grid is one slot with its cell, and a section knows nothing of columns', () => {
	const GridView = ({ children }: { children: ReactNode }): ReactNode => children

	// @ts-expect-error a grid without its `Item` is half a slot
	const halfGrid: FormComponents = { Grid: GridView }

	const SectionView = ({ children }: { children: ReactNode; columns: number }): ReactNode => children
	// @ts-expect-error `columns` belongs to the grid, not to the section
	const columnedSection: FormComponents = { Section: SectionView }

	expectTypeOf(halfGrid).toEqualTypeOf<FormComponents>()
	expectTypeOf(columnedSection).toEqualTypeOf<FormComponents>()
})
