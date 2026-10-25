import { FormFieldType } from '@ez-kit/form-core'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createSchemaForm } from '../create-schema-form'
import { testComponents, testFields, testFormElement } from '../test-kit'

import type { FormSchema, Translate } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * A block is its component written as data: it resolves from the bundle's `components`, takes its
 * `props` flat under the names JSX uses, and — given `children` — is a container the renderer
 * fills. `columns` on any container puts a `Grid` inside it.
 */

type CardProps = { title?: ReactNode; tone?: string; children?: ReactNode }

function Card({ title, tone, children }: CardProps): ReactNode {
	return (
		<article
			data-testid='card'
			data-tone={tone}
		>
			{title !== undefined && <h4>{title}</h4>}
			{children}
		</article>
	)
}

const { SchemaForm, Form } = createSchemaForm({
	FormElement: testFormElement,
	fields: testFields,
	components: { ...testComponents, Card },
})

type Values = { email: string; age: number; people: { first: string; last: string }[] }

const DEFAULTS: Values = { email: '', age: 0, people: [{ first: '', last: '' }] }

type RenderOptions = { translate?: Translate; onSubmit?: () => void }

function renderSchema(schema: FormSchema<Values>, { translate, onSubmit = () => {} }: RenderOptions = {}): void {
	render(
		<SchemaForm
			schema={schema}
			defaultValues={DEFAULTS}
			onSubmit={onSubmit}
			{...(translate !== undefined && { translate })}
		/>,
	)
}

describe('a block resolves from components', () => {
	it('renders the same component JSX reaches as form.Card', () => {
		renderSchema({ version: 1, children: [{ type: 'block', component: 'Card', props: { title: 'Doc' } }] })
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<form.Card title='Jsx'>
						<span />
					</form.Card>
				)}
			</Form>,
		)

		const cards = screen.getAllByTestId('card')
		expect(cards.map((card) => card.textContent)).toEqual(['Doc', 'Jsx'])
	})
})

describe('a block takes its props flat', () => {
	it('passes props under their own names', () => {
		renderSchema({
			version: 1,
			children: [{ type: 'block', component: 'Card', props: { title: 'Address', tone: 'muted' } }],
		})

		expect(screen.getByRole('heading', { name: 'Address' })).toBeInTheDocument()
		expect(screen.getByTestId('card')).toHaveAttribute('data-tone', 'muted')
	})

	it('translates an { i18n } value and leaves a string alone', () => {
		renderSchema(
			{
				version: 1,
				children: [{ type: 'block', component: 'Card', props: { title: { i18n: 'address' }, tone: 'address' } }],
			},
			{ translate: (key) => key.toUpperCase() },
		)

		expect(screen.getByRole('heading', { name: 'ADDRESS' })).toBeInTheDocument()
		expect(screen.getByTestId('card')).toHaveAttribute('data-tone', 'address')
	})

	it('renders a SubmitButton leaf from its props.children and submits the form', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		renderSchema(
			{ version: 1, children: [{ type: 'block', component: 'SubmitButton', props: { children: 'Send' } }] },
			{ onSubmit },
		)

		await user.click(screen.getByRole('button', { name: 'Send' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})
	})
})

describe('a block with children is a container', () => {
	it('renders its children inside the component, at their own paths', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		renderSchema(
			{
				version: 1,
				children: [
					{
						type: 'block',
						component: 'Section',
						props: { title: 'Contact' },
						children: [{ type: FormFieldType.Text, name: 'email', label: 'Email' }],
					},
					{ type: 'block', component: 'SubmitButton', props: { children: 'Send' } },
				],
			},
			{ onSubmit },
		)

		const section = screen.getByTestId('section')
		expect(section).toContainElement(screen.getByLabelText('Email'))
		expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument()

		await user.type(screen.getByLabelText('Email'), 'a@b.c')
		await user.click(screen.getByRole('button', { name: 'Send' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({ value: expect.objectContaining({ email: 'a@b.c' }) as unknown }),
			)
		})
	})

	it('hides its whole subtree with when, which then holds no submit back', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		renderSchema(
			{
				version: 1,
				children: [
					{ type: FormFieldType.Number, name: 'age', label: 'Age' },
					{
						type: 'block',
						component: 'Card',
						when: { field: 'age', gt: 17 },
						children: [{ type: FormFieldType.Text, name: 'email', label: 'Email', validate: { required: true } }],
					},
					{ type: 'block', component: 'SubmitButton', props: { children: 'Send' } },
				],
			},
			{ onSubmit },
		)

		expect(screen.queryByTestId('card')).not.toBeInTheDocument()
		expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Send' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})
	})
})

describe('columns put a grid inside the container', () => {
	it('wraps a block’s children in Grid and each child in Grid.Item with its colSpan', () => {
		renderSchema({
			version: 1,
			children: [
				{
					type: 'block',
					component: 'Section',
					columns: 2,
					children: [
						{ type: FormFieldType.Text, name: 'email', label: 'Email' },
						{ type: FormFieldType.Number, name: 'age', label: 'Age', colSpan: 2 },
					],
				},
			],
		})

		const grid = screen.getByTestId('grid')
		expect(grid).toHaveAttribute('data-columns', '2')
		expect(screen.getByTestId('section')).toContainElement(grid)
		const items = screen.getAllByTestId('grid-item')
		expect(items).toHaveLength(2)
		expect(items[1]).toHaveAttribute('data-col-span', '2')
		expect(items[1]).toContainElement(screen.getByLabelText('Age'))
	})

	it('lays out the top level when the document sets columns', () => {
		renderSchema({
			version: 1,
			columns: 2,
			children: [
				{ type: FormFieldType.Text, name: 'email', label: 'Email' },
				{ type: FormFieldType.Number, name: 'age', label: 'Age' },
			],
		})

		expect(screen.getByTestId('grid')).toHaveAttribute('data-columns', '2')
		expect(screen.getAllByTestId('grid-item')).toHaveLength(2)
	})

	it('lays out the fields of each array entry', () => {
		renderSchema({
			version: 1,
			children: [
				{
					type: 'array',
					name: 'people',
					columns: 2,
					children: [
						{ type: FormFieldType.Text, name: 'first', label: 'First' },
						{ type: FormFieldType.Text, name: 'last', label: 'Last' },
					],
				},
			],
		})

		const grid = screen.getByTestId('grid')
		expect(grid).toHaveAttribute('data-columns', '2')
		expect(grid).toContainElement(screen.getByLabelText('First'))
	})

	it('leaves no empty cell for a child hidden by when, and gives it one once it shows', async () => {
		const user = userEvent.setup()
		renderSchema({
			version: 1,
			columns: 2,
			children: [
				{ type: FormFieldType.Number, name: 'age', label: 'Age' },
				{ type: FormFieldType.Text, name: 'email', label: 'Email', colSpan: 2, when: { field: 'age', gt: 17 } },
			],
		})

		expect(screen.getAllByTestId('grid-item')).toHaveLength(1)

		await user.type(screen.getByLabelText('Age'), '18')

		const items = screen.getAllByTestId('grid-item')
		expect(items).toHaveLength(2)
		expect(items[1]).toHaveAttribute('data-col-span', '2')
		expect(items[1]).toContainElement(screen.getByLabelText('Email'))
	})

	it('renders children bare when no container sets columns', () => {
		renderSchema({
			version: 1,
			children: [{ type: 'block', component: 'Card', children: [{ type: FormFieldType.Text, name: 'email' }] }],
		})

		expect(screen.queryByTestId('grid')).not.toBeInTheDocument()
		expect(screen.queryByTestId('grid-item')).not.toBeInTheDocument()
	})
})
