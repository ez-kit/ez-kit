import { FormFieldType } from '@ez-kit/form-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Form, FormRenderer } from './form'

import type { DateRangeValue, FormSchema } from '@ez-kit/form-core'

/**
 * The kit's remaining field kinds, and its wizard.
 *
 * `index.test.tsx` renders every kind once; this file *drives* the ones where the kit does
 * real translation work between the contract and React Aria — a number onto a range input, a
 * `YYYY-MM-DD` string onto `@internationalized/date`'s `CalendarDate`, a two-ended range, and
 * a wizard whose steps exist only in a schema. Those conversions are where a silent break
 * survives a smoke test.
 */

type Values = {
	notify: boolean
	volume: number
	born: string
	stay: DateRangeValue
}

const DEFAULTS: Values = { notify: false, volume: 20, born: '', stay: { start: '', end: '' } }

function Case({ values, onSubmit }: { values?: Partial<Values>; onSubmit?: (value: Values) => void }) {
	return (
		<Form
			defaultValues={{ ...DEFAULTS, ...values }}
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

describe('@ez-kit/form-heroui switch and slider', () => {
	it('toggles the switch and submits a boolean', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		render(<Case onSubmit={submitted} />)

		await user.click(screen.getByRole('switch', { name: 'Notify me' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		expect(submitted).toHaveBeenCalledWith(expect.objectContaining({ notify: true }))
	})

	it('moves the slider by its `step` and submits a number', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		render(<Case onSubmit={submitted} />)

		// React Aria labels the thumb's input through the field's own label, so unlike the
		// shadcn kit this one is reachable by name.
		const slider = screen.getByRole('slider', { name: 'Volume' })
		expect(slider).toHaveValue('20')

		await user.click(slider)
		await user.keyboard('{ArrowRight}')

		expect(slider).toHaveValue('30')

		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(submitted).toHaveBeenCalledWith(expect.objectContaining({ volume: 30 }))
	})

	it('respects `min` and `max`', () => {
		render(<Case />)

		const slider = screen.getByRole('slider', { name: 'Volume' })
		expect(slider).toHaveAttribute('min', '0')
		expect(slider).toHaveAttribute('max', '100')
	})
})

describe('@ez-kit/form-heroui date fields', () => {
	it('renders a `YYYY-MM-DD` value into the date segments', () => {
		render(<Case values={{ born: '2024-03-15' }} />)

		const segments = screen
			.getAllByRole('spinbutton')
			.filter((el) => !(el.getAttribute('aria-label') ?? '').includes('Date'))
		expect(segments.map((el) => el.textContent)).toEqual(['3', '15', '2024'])
	})

	it('renders both ends of a range', () => {
		render(<Case values={{ stay: { start: '2024-03-01', end: '2024-03-10' } }} />)

		const start = screen
			.getAllByRole('spinbutton')
			.filter((el) => (el.getAttribute('aria-label') ?? '').includes('Start Date'))
		const end = screen
			.getAllByRole('spinbutton')
			.filter((el) => (el.getAttribute('aria-label') ?? '').includes('End Date'))

		expect(start.map((el) => el.textContent)).toEqual(['3', '1', '2024'])
		expect(end.map((el) => el.textContent)).toEqual(['3', '10', '2024'])
	})

	it('leaves the segments empty for a malformed value rather than guessing at one', () => {
		// `asDateRange` rejects anything that is not two well-formed ends, so a caller's bad
		// `defaultValues` reaches the picker as "no value" instead of throwing inside it.
		render(<Case values={{ stay: { start: 'yesterday', end: '' } }} />)

		const start = screen
			.getAllByRole('spinbutton')
			.filter((el) => (el.getAttribute('aria-label') ?? '').includes('Start Date'))
		expect(start.map((el) => el.textContent)).toEqual(['mm', 'dd', 'yyyy'])
	})

	it('offers a calendar trigger for each picker', () => {
		render(<Case />)

		// A regex, not the exact string: React Aria gives the trigger both `aria-label="Calendar"`
		// and an `aria-labelledby` that folds in the field's own label, and the latter wins the
		// accessible-name computation — so the name reads "Calendar Born", not "Calendar".
		expect(screen.getAllByRole('button', { name: /calendar/i })).toHaveLength(2)
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

describe('@ez-kit/form-heroui wizard', () => {
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

describe('@ez-kit/form-heroui sections and grid', () => {
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
