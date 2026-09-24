import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields } from './test-kit'

type Person = { firstName: string }
type Values = { people: Person[] }

const { Form } = createForm({ components: testComponents, fields: testFields })
const NEW_PERSON: Person = { firstName: '' }

function BareList({ onSubmit }: { onSubmit?: (values: Values) => void }) {
	return (
		<Form
			defaultValues={{ people: [{ firstName: 'Ada' }] }}
			onSubmit={({ value }) => {
				onSubmit?.(value)
			}}
		>
			{(form) => (
				<>
					<form.Array
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items, add, canAdd }) => (
							<ul>
								{items.map((item) => (
									<li key={item.key}>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
										<button
											type='button'
											onClick={item.remove}
										>{`remove ${String(item.index)}`}</button>
									</li>
								))}
								<button
									type='button'
									onClick={() => {
										add()
									}}
									disabled={!canAdd}
								>
									add
								</button>
							</ul>
						)}
					</form.Array>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}

function scopeFlags(scope: { disabled: boolean; required: boolean }) {
	return (
		<div>
			<span data-testid='scope-disabled'>{String(scope.disabled)}</span>
			<span data-testid='scope-required'>{String(scope.required)}</span>
		</div>
	)
}

/** `disabled` / `required` omitted entirely — never passed, not even as `undefined`. */
function ScopeFlagsOmittedList() {
	return (
		<Form
			defaultValues={{ people: [{ firstName: 'Ada' }] }}
			onSubmit={() => {
				// unused in this assertion
			}}
		>
			{(form) => (
				<form.Array
					name='people'
					newItem={NEW_PERSON}
				>
					{scopeFlags}
				</form.Array>
			)}
		</Form>
	)
}

function ScopeFlagsGivenList() {
	return (
		<Form
			defaultValues={{ people: [{ firstName: 'Ada' }] }}
			onSubmit={() => {
				// unused in this assertion
			}}
		>
			{(form) => (
				<form.Array
					name='people'
					newItem={NEW_PERSON}
					disabled
					required
				>
					{scopeFlags}
				</form.Array>
			)}
		</Form>
	)
}

function MaxLengthList() {
	return (
		<Form
			defaultValues={{ people: [{ firstName: 'Ada' }] }}
			onSubmit={() => {
				// unused in this assertion
			}}
		>
			{(form) => (
				<form.Array
					name='people'
					newItem={NEW_PERSON}
					validate={{ maxLength: 1 }}
				>
					{({ items, add, canAdd }) => (
						<ul>
							{items.map((item) => (
								<li key={item.key}>
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
									/>
								</li>
							))}
							<button
								type='button'
								onClick={() => {
									add()
								}}
								disabled={!canAdd}
							>
								add
							</button>
						</ul>
					)}
				</form.Array>
			)}
		</Form>
	)
}

describe('form.Array', () => {
	it('renders no chrome of its own', () => {
		render(<BareList />)
		// test-kit's ArrayField / ArrayItem stamp `data-testkit`, not `data-slot`; assert against
		// the literals the kit actually writes (verified against test-kit.tsx), not a slot the kit
		// never stamps — a query for a slot that is stamped nowhere can never fail and proves
		// nothing.
		expect(document.querySelector('[data-testkit="array"]')).toBeNull()
		expect(document.querySelector('[data-testkit="array-items"]')).toBeNull()
		expect(document.querySelector('[data-testkit="array-item"]')).toBeNull()
		expect(document.querySelector('[data-field-type="array"]')).toBeNull()
		expect(screen.getByRole('list')).toBeInTheDocument()
	})

	it('surfaces disabled and required on the scope, normalised to false when omitted', () => {
		render(<ScopeFlagsOmittedList />)
		expect(screen.getByTestId('scope-disabled')).toHaveTextContent('false')
		expect(screen.getByTestId('scope-required')).toHaveTextContent('false')
	})

	it('surfaces disabled and required on the scope as data when given, since the primitive draws no frame to put them on', () => {
		render(<ScopeFlagsGivenList />)
		expect(screen.getByTestId('scope-disabled')).toHaveTextContent('true')
		expect(screen.getByTestId('scope-required')).toHaveTextContent('true')
	})

	it('forwards validate to the engine, so canAdd reflects maxLength', () => {
		render(<MaxLengthList />)
		expect(screen.getByRole('button', { name: 'add' })).toBeDisabled()
	})

	it('removes the entry the author asked for', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<BareList onSubmit={onSubmit} />)

		await user.click(screen.getByRole('button', { name: 'add' }))
		await user.type(screen.getByLabelText('Name 1'), 'Grace')
		await user.click(screen.getByRole('button', { name: 'remove 0' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ firstName: 'Grace' }] })
		})
	})

	it('addresses the entry paths from inside an entry', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<BareList onSubmit={onSubmit} />)

		await user.clear(screen.getByLabelText('Name 0'))
		await user.type(screen.getByLabelText('Name 0'), 'Katherine')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ firstName: 'Katherine' }] })
		})
	})
})

describe('the kit row inside form.Array', () => {
	it('renders the kit row with the captions the author gave', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={{ people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => (
					<>
						<form.Array
							name='people'
							newItem={NEW_PERSON}
						>
							{({ items }) => (
								<section>
									{items.map((item) => (
										<item.Item
											key={item.key}
											label={`Person ${String(item.index + 1)}`}
											removeLabel='Drop'
											reorderable
										>
											<item.TextField
												name='firstName'
												label={`Name ${String(item.index)}`}
											/>
										</item.Item>
									))}
								</section>
							)}
						</form.Array>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		expect(screen.getByText('Person 1')).toBeInTheDocument()
		// The row asked for `reorderable` itself — the array-level setting was never given — so
		// the move controls must appear from the row's own prop, not from a fallback that only
		// reads the array's.
		expect(screen.getByRole('button', { name: 'down 0' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'up 1' })).toBeInTheDocument()
		await user.click(screen.getByRole('button', { name: 'Drop 0' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ firstName: 'Grace' }] })
		})
	})

	it('offers no move control on a row that did not ask for one', () => {
		render(
			<Form defaultValues={{ people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}>
				{(form) => (
					<form.Array
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items }) => (
							<section>
								{items.map((item) => (
									<item.Item
										key={item.key}
										removeLabel='Drop'
									>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
									</item.Item>
								))}
							</section>
						)}
					</form.Array>
				)}
			</Form>,
		)

		expect(screen.queryByRole('button', { name: 'up 0' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'down 0' })).toBeNull()
		expect(screen.getByRole('button', { name: 'Drop 0' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Drop 1' })).toBeInTheDocument()
	})

	it('renders the object form of a row-level reorderable, captions and all', () => {
		render(
			<Form defaultValues={{ people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}>
				{(form) => (
					<form.Array
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items }) => (
							<section>
								{items.map((item) => (
									<item.Item
										key={item.key}
										reorderable={{ up: { label: 'Hoist' }, down: { label: 'Sink' } }}
									>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
									</item.Item>
								))}
							</section>
						)}
					</form.Array>
				)}
			</Form>,
		)

		// The test kit puts the caption in the button's text content, not its `aria-label`
		// (which is `up ${index}` / `down ${index}` regardless of caption) — so this is the only
		// assertion in the file that can tell the object form's captions apart from the default
		// ones, `up 1`/`down 0` name-only checks elsewhere cannot.
		expect(screen.getByRole('button', { name: 'down 0' })).toHaveTextContent('Sink')
		expect(screen.getByRole('button', { name: 'up 1' })).toHaveTextContent('Hoist')
	})
})

const THREE_PEOPLE: Person[] = [{ firstName: 'Ada' }, { firstName: 'Grace' }, { firstName: 'Lin' }]

/**
 * The scope members the composed `form.ArrayField` never leaves anything to do with, driven
 * from the bare primitive: the indexed `remove`, and each entry's own `moveUp` / `moveDown`.
 *
 * The kit's own row wires `onMoveUp` / `onMoveDown` — a *different* closure — so a button click
 * inside `item.Item` proves nothing about these three. They are called directly here, and the
 * resulting order is read back off the rendered fields as well as off the submitted value: a
 * `moveUp` implemented as `move(index, index + 1)` moves an entry, just the wrong way, so only
 * an order assertion can tell the two apart.
 */
function ControlsList({
	onSubmit,
	initial = THREE_PEOPLE,
}: {
	onSubmit?: (values: Values) => void
	initial?: Person[]
}) {
	return (
		<Form
			defaultValues={{ people: initial }}
			onSubmit={({ value }) => {
				onSubmit?.(value)
			}}
		>
			{(form) => (
				<>
					<form.Array
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items, remove }) => (
							<ul>
								{items.map((item) => (
									<li key={item.key}>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
										<button
											type='button'
											onClick={item.moveUp}
										>{`up ${String(item.index)}`}</button>
										<button
											type='button'
											onClick={item.moveDown}
										>{`down ${String(item.index)}`}</button>
										<button
											type='button'
											onClick={() => {
												remove(item.index)
											}}
										>{`drop ${String(item.index)}`}</button>
									</li>
								))}
							</ul>
						)}
					</form.Array>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}

/** The rendered order, read off the entries' own inputs rather than off the form state. */
function renderedNames(): string[] {
	return screen.getAllByRole('textbox').map((input) => {
		if (!(input instanceof HTMLInputElement)) throw new Error('expected a text input per entry')
		return input.value
	})
}

describe('the scope mutations the kit chrome does not use', () => {
	it('moves an entry up when the entry itself is asked to', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<ControlsList onSubmit={onSubmit} />)

		await user.click(screen.getByRole('button', { name: 'up 1' }))

		expect(renderedNames()).toEqual(['Grace', 'Ada', 'Lin'])
		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({
				people: [{ firstName: 'Grace' }, { firstName: 'Ada' }, { firstName: 'Lin' }],
			})
		})
	})

	it('moves an entry down when the entry itself is asked to', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<ControlsList onSubmit={onSubmit} />)

		await user.click(screen.getByRole('button', { name: 'down 1' }))

		expect(renderedNames()).toEqual(['Ada', 'Lin', 'Grace'])
		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({
				people: [{ firstName: 'Ada' }, { firstName: 'Lin' }, { firstName: 'Grace' }],
			})
		})
	})

	it('leaves the order alone when the entry at either end is asked to move past it', async () => {
		const user = userEvent.setup()
		render(<ControlsList />)

		await user.click(screen.getByRole('button', { name: 'up 0' }))
		await user.click(screen.getByRole('button', { name: 'down 2' }))

		expect(renderedNames()).toEqual(['Ada', 'Grace', 'Lin'])
	})

	it('removes the entry at the index the scope was given', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<ControlsList onSubmit={onSubmit} />)

		await user.click(screen.getByRole('button', { name: 'drop 1' }))

		expect(renderedNames()).toEqual(['Ada', 'Lin'])
		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ firstName: 'Ada' }, { firstName: 'Lin' }] })
		})
	})
})

/**
 * `errors` / `invalid` are Decision 5's whole subject: the primitive renders no frame, so the
 * list's own validation failures reach the scope as data and nothing puts them on screen unless
 * the render prop does. Their only consumer anywhere else is one line of a docs example.
 */
function ValidatedList() {
	return (
		<Form defaultValues={{ people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}>
			{(form) => (
				<form.Array
					name='people'
					newItem={NEW_PERSON}
					validate={{ minLength: 2 }}
				>
					{({ items, remove, errors, invalid }) => (
						<ul>
							{items.map((item) => (
								<li key={item.key}>
									<item.TextField
										name='firstName'
										label={`Name ${String(item.index)}`}
									/>
									<button
										type='button'
										onClick={() => {
											remove(item.index)
										}}
									>{`drop ${String(item.index)}`}</button>
								</li>
							))}
							<span data-testid='scope-invalid'>{String(invalid)}</span>
							{invalid ? <p role='alert'>{errors.join(', ')}</p> : null}
						</ul>
					)}
				</form.Array>
			)}
		</Form>
	)
}

describe('the list’s own validation, read off the scope', () => {
	it('carries the list’s errors and invalid flag once the list breaks its own constraint', async () => {
		const user = userEvent.setup()
		render(<ValidatedList />)

		expect(screen.getByTestId('scope-invalid')).toHaveTextContent('false')
		expect(screen.queryByRole('alert')).toBeNull()

		await user.click(screen.getByRole('button', { name: 'drop 1' }))

		expect(screen.getByTestId('scope-invalid')).toHaveTextContent('true')
		expect(screen.getByRole('alert')).toHaveTextContent('Must be at least 2 items')
	})
})
