import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

type Person = { firstName: string }
type Values = { title: string; people: Person[] }

/** First match, or a failure that names the problem — `[0]` alone is possibly-undefined here. */
function first<T>(items: readonly T[]): T {
	const [head] = items
	if (head === undefined) throw new Error('expected at least one match')
	return head
}

const { Form } = createForm({ components: testComponents })

const NEW_PERSON: Person = { firstName: '' }

function PeopleForm({
	onSubmit,
	defaults,
	reorderable,
	maxLength,
}: {
	onSubmit?: (values: Values) => void
	defaults?: Values
	reorderable?: boolean
	maxLength?: number
}) {
	return (
		<Form
			defaultValues={defaults ?? { title: '', people: [] }}
			onSubmit={({ value }) => {
				onSubmit?.(value)
			}}
		>
			{(form) => (
				<>
					<form.ArrayField
						name='people'
						label='People'
						newItem={NEW_PERSON}
						addLabel='Add person'
						removeLabel='Remove'
						{...(reorderable === undefined ? {} : { reorderable })}
						{...(maxLength === undefined ? {} : { validate: { maxLength } })}
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
									/>
								</item.Item>
							))
						}
					</form.ArrayField>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}

const nameBox = (index: number): HTMLInputElement => screen.getByLabelText(`Name ${String(index)}`)

describe('form.ArrayField', () => {
	it('appends an entry and submits it under the array path', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<PeopleForm onSubmit={onSubmit} />)

		await user.click(screen.getByRole('button', { name: 'Add person' }))
		await user.type(nameBox(0), 'Анна')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ title: '', people: [{ firstName: 'Анна' }] })
		})
	})

	it('names each entry by its real path, so a field writes into its own item', async () => {
		const user = userEvent.setup()
		render(<PeopleForm />)

		await user.click(screen.getByRole('button', { name: 'Add person' }))
		await user.click(screen.getByRole('button', { name: 'Add person' }))

		expect(nameBox(0)).toHaveAttribute('name', 'people[0].firstName')
		expect(nameBox(1)).toHaveAttribute('name', 'people[1].firstName')
	})

	it('keeps the surviving entries and their values when one is removed from the middle', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<PeopleForm
				onSubmit={onSubmit}
				defaults={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }, { firstName: 'C' }] }}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Remove 1' }))

		expect(nameBox(0)).toHaveValue('A')
		expect(nameBox(1)).toHaveValue('C')

		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ title: '', people: [{ firstName: 'A' }, { firstName: 'C' }] })
		})
	})

	it('does not remount the entries that survive a removal from the middle', async () => {
		// The defect this guards against is invisible in form values: a remount loses whatever
		// state lives inside the control — an open calendar, a caret, a half-typed search query —
		// while the submitted data still looks right. The counter stands in for that state.
		const mounts = vi.fn()

		function Counted() {
			useState(() => {
				mounts()
				return null
			})
			return null
		}

		const user = userEvent.setup()
		render(
			<Form defaultValues={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }, { firstName: 'C' }] }}>
				{(form) => (
					<form.ArrayField
						name='people'
						newItem={NEW_PERSON}
						removeLabel='Remove'
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<Counted />
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
									/>
								</item.Item>
							))
						}
					</form.ArrayField>
				)}
			</Form>,
		)

		expect(mounts).toHaveBeenCalledTimes(3)
		await user.click(screen.getByRole('button', { name: 'Remove 1' }))
		// Two entries remain and neither was rebuilt, so no further mount happened.
		expect(mounts).toHaveBeenCalledTimes(3)
	})

	it('offers no reorder controls unless asked, and disables the impossible move', async () => {
		const user = userEvent.setup()
		render(<PeopleForm defaults={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }} />)
		expect(screen.queryByRole('button', { name: 'up 0' })).toBeNull()

		render(
			<PeopleForm
				reorderable
				defaults={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }}
			/>,
		)
		const ups = screen.getAllByRole('button', { name: 'up 0' })
		expect(ups[0]).toBeDisabled()
		const downs = screen.getAllByRole('button', { name: 'down 1' })
		expect(downs[0]).toBeDisabled()
		await user.click(first(screen.getAllByRole('button', { name: 'down 0' })))
	})

	it('moves an entry and its value together', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<PeopleForm
				reorderable
				onSubmit={onSubmit}
				defaults={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'down 0' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ title: '', people: [{ firstName: 'B' }, { firstName: 'A' }] })
		})
	})

	it('disables the add control at `max` rather than hiding it', async () => {
		const user = userEvent.setup()
		render(
			<PeopleForm
				maxLength={2}
				defaults={{ title: '', people: [{ firstName: 'A' }] }}
			/>,
		)

		const add = screen.getByRole('button', { name: 'Add person' })
		expect(add).toBeEnabled()
		await user.click(add)
		expect(screen.getByRole('button', { name: 'Add person' })).toBeDisabled()
	})

	it("passes the list's disabled state down to every entry, so its chrome is inert too", () => {
		render(
			<Form defaultValues={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }}>
				{(form) => (
					<form.ArrayField
						name='people'
						newItem={NEW_PERSON}
						removeLabel='Remove'
						reorderable
						disabled
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
									/>
								</item.Item>
							))
						}
					</form.ArrayField>
				)}
			</Form>,
		)

		// A disabled list must not offer a live remove or move on any row — the fields inside may
		// be disabled by the kit's own fieldset, but these controls are the entry's own chrome.
		expect(screen.getByRole('button', { name: 'Remove 0' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'down 0' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'up 1' })).toBeDisabled()
	})

	it('takes reorder captions from the object form of `reorderable`', () => {
		render(
			<Form defaultValues={{ title: '', people: [{ firstName: 'A' }, { firstName: 'B' }] }}>
				{(form) => (
					<form.ArrayField
						name='people'
						newItem={NEW_PERSON}
						removeLabel='Remove'
						reorderable={{ up: { label: 'Выше' }, down: { label: 'Ниже' } }}
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
									/>
								</item.Item>
							))
						}
					</form.ArrayField>
				)}
			</Form>,
		)

		// The object form only adds captions — it still means "offer reordering", like `true`.
		expect(screen.getByRole('button', { name: 'down 0' })).toHaveTextContent('Ниже')
		expect(screen.getByRole('button', { name: 'up 1' })).toHaveTextContent('Выше')
		expect(screen.getByRole('button', { name: 'up 0' })).toBeDisabled()
	})
})
