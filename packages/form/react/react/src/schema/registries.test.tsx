import { FormFieldType } from '@ez-kit/form-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { createForm } from '../create-form'
import { testComponents } from '../test-kit'

import type { CustomFieldRenderProps } from './registries'
import type { FormSchema } from '@ez-kit/form-core'

const { FormRenderer } = createForm({ components: testComponents })

type RatingValues = { score: number }

// `CustomFieldRenderProps` here, not `CustomFieldRenderProps<number>`: `CustomFieldRegistry`
// holds one function-typed slot per key (`Record<string, (props: CustomFieldRenderProps) =>
// ReactNode>`), so a component registered under it must accept the registry's own (unknown)
// value type — the same reason `form.AppField`'s `onChange` narrows with a runtime cast in
// `RenderNode` rather than a compile-time one. A concrete `TValue` is for a component used
// standalone, outside a registry.
const Rating = ({ id, label, value, onChange, props, invalid }: CustomFieldRenderProps) => (
	<div
		data-testid='rating'
		data-invalid={invalid}
		data-max={String(props.max)}
	>
		<label htmlFor={id}>{label}</label>
		<input
			id={id}
			value={String(value ?? '')}
			onChange={(e) => {
				onChange(Number(e.target.value))
			}}
		/>
	</div>
)

test('a custom field receives the full binding, not just its own props', async () => {
	const user = userEvent.setup()

	const schema = {
		version: 1,
		children: [{ type: 'rating', name: 'score', label: 'Score', props: { max: 5 } }],
	} as FormSchema<RatingValues, 'rating'>

	render(
		<FormRenderer
			schema={schema}
			fields={{ rating: Rating }}
			defaultValues={{ score: 0 }}
			onSubmit={() => {}}
		/>,
	)

	// The registered component rendered, and it received `props` (schema-authored data) —
	// not just the binding.
	expect(screen.getByTestId('rating')).toHaveAttribute('data-max', '5')
	// The `id` the binding generated ties the field's own `<label htmlFor>` to its control —
	// only the binding layer could have supplied a matching pair here, since `Rating` never
	// invents its own id.
	expect(screen.getByLabelText('Score')).toBe(screen.getByTestId('rating').querySelector('input'))

	await user.clear(screen.getByLabelText('Score'))
	await user.type(screen.getByLabelText('Score'), '4')
	expect(screen.getByLabelText('Score')).toHaveValue('4')
})

test('a custom field receives `invalid`, distinct from its own `props`', () => {
	const schema = {
		version: 1,
		children: [{ type: 'rating', name: 'score', label: 'Score', props: { max: 5 } }],
	} as FormSchema<RatingValues, 'rating'>

	const { container } = render(
		<FormRenderer
			schema={schema}
			fields={{ rating: Rating }}
			defaultValues={{ score: 0 }}
			onSubmit={() => {}}
		/>,
	)

	// No validator is wired up yet in this task (that is the next task's job), so `invalid`
	// starts false — this proves the binding's own `invalid` flag reaches the custom
	// component at all, separate from the schema-authored `props.max` asserted above.
	const root = container.querySelector('[data-testid="rating"]')
	expect(root).toHaveAttribute('data-invalid', 'false')
})

type BlockValues = { name: string }

test('a block renders without binding to any value', () => {
	const Banner = ({ props }: { props: Record<string, unknown> }) => <div data-testid='banner'>{String(props.text)}</div>

	const schema: FormSchema<BlockValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'name', label: 'Name' },
			{ type: 'block', component: 'banner', props: { text: 'Heads up' } },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			blocks={{ banner: Banner }}
			defaultValues={{ name: '' }}
			onSubmit={() => {}}
		/>,
	)

	// The block rendered its own markup, driven only by `props` …
	expect(screen.getByTestId('banner')).toHaveTextContent('Heads up')
	// … and contributed no field: it never appears as a labelled control, and the real field
	// next to it still works normally.
	expect(screen.queryByLabelText('Heads up')).not.toBeInTheDocument()
	expect(screen.getByLabelText('Name')).toBeInTheDocument()
})

test('an unknown node type throws with the type named', () => {
	const schema = {
		version: 1,
		children: [{ type: 'rating', name: 'score', label: 'Score' }],
	} as FormSchema<RatingValues, 'rating'>

	// No `fields` registry passed — `rating` is neither a built-in kind nor registered.
	expect(() =>
		render(
			<FormRenderer
				schema={schema}
				defaultValues={{ score: 0 }}
				onSubmit={() => {}}
			/>,
		),
	).toThrow(/rating/)
})

test('registering a reserved key throws', () => {
	const emptySchema: FormSchema<RatingValues> = { version: 1, children: [] }
	const Custom = (_props: CustomFieldRenderProps) => null

	expect(() =>
		render(
			<FormRenderer
				schema={emptySchema}
				fields={{ section: Custom }}
				defaultValues={{ score: 0 }}
				onSubmit={() => {}}
			/>,
		),
	).toThrow(/reserved/i)
})

type SubmitValues = { name: string }

test('the submit node renders the kit button and submits the form', async () => {
	const user = userEvent.setup()
	const onSubmit = vi.fn()

	const schema: FormSchema<SubmitValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'name', label: 'Name' },
			{ type: 'submit', label: 'Save' },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '' }}
			onSubmit={onSubmit}
		/>,
	)

	await user.click(screen.getByRole('button', { name: 'Save' }))
	expect(onSubmit).toHaveBeenCalledOnce()
})
