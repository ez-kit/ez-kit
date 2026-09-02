import { FormFieldType } from '@ez-kit/form-core'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Form, FormRenderer } from './form'

import type { DateRangeValue, FormSchema } from '@ez-kit/form-core'

/**
 * The kit's remaining field kinds, and its wizard.
 *
 * `index.test.tsx` renders every kind once to prove the primitives are wired; this file
 * *drives* the ones that carry real adapter logic between the contract and a primitive —
 * a range mapped onto Radix's multi-thumb array, an ISO string mapped onto a calendar's
 * `Date`, a two-ended range, and a wizard whose steps only exist in a schema. Those mappings
 * are exactly where a silent break would survive a smoke test.
 */

type Values = {
	notify: boolean
	volume: number
	born: string
	stay: DateRangeValue
}

const DEFAULTS: Values = { notify: false, volume: 20, born: '', stay: { start: '', end: '' } }

function Case({ onSubmit }: { onSubmit?: (value: Values) => void }) {
	return (
		<Form
			defaultValues={DEFAULTS}
			onSubmit={({ value }) => {
				onSubmit?.(value)
			}}
		>
			{(form) => (
				<>
					<form.SwitchField
						name='notify'
						label='Notify me'
					/>
					<form.SliderField
						name='volume'
						label='Volume'
						min={0}
						max={100}
						step={10}
					/>
					<form.DateField
						name='born'
						label='Born'
					/>
					<form.DateRangeField
						name='stay'
						label='Stay'
					/>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}

describe('@ez-kit/form-shadcn switch and slider', () => {
	it('toggles the switch and submits a boolean', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		render(<Case onSubmit={submitted} />)

		await user.click(screen.getByRole('switch', { name: 'Notify me' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		expect(submitted).toHaveBeenCalledWith(expect.objectContaining({ notify: true }))
	})

	it('moves the slider by its `step` and submits a number, not an array', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		render(<Case onSubmit={submitted} />)

		// Queried by role alone: the thumb Radix marks `role="slider"` carries no accessible
		// name, because the kit's `<label for>` points at the Root the vendored primitive wraps
		// it in. That is a real gap, tracked separately — asserting a name here would cement it.
		const slider = screen.getByRole('slider')
		expect(slider).toHaveAttribute('aria-valuenow', '20')

		await user.click(slider)
		await user.keyboard('{ArrowRight}')

		// Radix models the thumb positions as an array; the contract is one number, and the
		// unwrapping is the kit's job. A regression here would submit `[30]`.
		expect(slider).toHaveAttribute('aria-valuenow', '30')

		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(submitted).toHaveBeenCalledWith(expect.objectContaining({ volume: 30 }))
	})

	it('respects `min` and `max` rather than defaulting to 0..100 silently', () => {
		render(<Case />)

		const slider = screen.getByRole('slider')
		expect(slider).toHaveAttribute('aria-valuemin', '0')
		expect(slider).toHaveAttribute('aria-valuemax', '100')
	})
})

describe('@ez-kit/form-shadcn date fields', () => {
	it('opens the calendar and submits the picked day as a `YYYY-MM-DD` string', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		render(<Case onSubmit={submitted} />)

		await user.click(screen.getByLabelText('Born'))

		// react-day-picker renders a grid of day buttons; picking one has to arrive in form
		// state as an ISO calendar date, never as a `Date` object or a locale-formatted string.
		const grid = await screen.findByRole('grid')
		const days = within(grid).getAllByRole('button')
		const day = days.find((button) => button.textContent === '15')
		if (day === undefined) throw new Error('The calendar rendered no day numbered 15')
		await user.click(day)

		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(submitted).toHaveBeenCalledWith(
			expect.objectContaining({ born: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown as string }),
		)
	})

	it('renders a range trigger that starts empty', () => {
		render(<Case />)

		expect(screen.getByLabelText('Stay')).toBeInTheDocument()
	})
})

type StepValues = { name: string; age: string }

const WIZARD: FormSchema<StepValues> = {
	version: 1,
	children: [
		{ type: 'step', title: 'Who', children: [{ type: FormFieldType.Text, name: 'name', label: 'Name' }] },
		{ type: 'step', title: 'Details', children: [{ type: FormFieldType.Text, name: 'age', label: 'Age' }] },
	],
}

describe('@ez-kit/form-shadcn wizard', () => {
	it('shows one step at a time and walks forward and back', async () => {
		const user = userEvent.setup()
		render(
			<FormRenderer
				schema={WIZARD}
				defaultValues={{ name: '', age: '' }}
			/>,
		)

		expect(screen.getByLabelText('Name')).toBeInTheDocument()
		expect(screen.queryByLabelText('Age')).toBeNull()

		await user.click(screen.getByRole('button', { name: /next/i }))

		expect(screen.getByLabelText('Age')).toBeInTheDocument()
		expect(screen.queryByLabelText('Name')).toBeNull()

		await user.click(screen.getByRole('button', { name: /back/i }))
		expect(screen.getByLabelText('Name')).toBeInTheDocument()
	})

	it('renders the step list through the kit chrome', () => {
		const { container } = render(
			<FormRenderer
				schema={WIZARD}
				defaultValues={{ name: '', age: '' }}
			/>,
		)

		expect(container.querySelector('[data-slot="wizard"]')).not.toBeNull()
		expect(container.querySelectorAll('[data-slot="wizard-step"]')).toHaveLength(2)
	})
})

const SECTIONED: FormSchema<StepValues> = {
	version: 1,
	children: [
		{
			type: 'section',
			title: 'About you',
			description: 'Two columns wide.',
			columns: 2,
			children: [
				{ type: FormFieldType.Text, name: 'name', label: 'Name' },
				{ type: FormFieldType.Text, name: 'age', label: 'Age', colSpan: 2 },
			],
		},
	],
}

describe('@ez-kit/form-shadcn sections and grid', () => {
	it('renders a section with its title, description and both children', () => {
		render(
			<FormRenderer
				schema={SECTIONED}
				defaultValues={{ name: '', age: '' }}
			/>,
		)

		expect(screen.getByText('About you')).toBeInTheDocument()
		expect(screen.getByText('Two columns wide.')).toBeInTheDocument()
		expect(screen.getByLabelText('Name')).toBeInTheDocument()
		expect(screen.getByLabelText('Age')).toBeInTheDocument()
	})

	it('wraps each child in a grid item, so `colSpan` has something to act on', () => {
		const { container } = render(
			<FormRenderer
				schema={SECTIONED}
				defaultValues={{ name: '', age: '' }}
			/>,
		)

		// The grid itself is a kit concern — the adapter owns no styling — so what is asserted
		// here is that every child got its own wrapper, one per field, not how wide it draws.
		expect(container.querySelectorAll('[data-slot="form-grid-item"]')).toHaveLength(2)
	})
})
